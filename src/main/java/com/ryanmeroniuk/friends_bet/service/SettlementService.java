package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.dto.WalletDepositRequest;
import com.ryanmeroniuk.friends_bet.model.Bet;
import com.ryanmeroniuk.friends_bet.model.Game;
import com.ryanmeroniuk.friends_bet.repository.BetRepository;
import com.ryanmeroniuk.friends_bet.repository.GameRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

/**
 * Settles bets once a game's final score is known.
 *
 * Money flow model (matches BetService escrow):
 * - On propose: proposer is debited amountCents.
 * - On accept:  acceptor is debited acceptorStakeCents = round(amount * (odds - 1)).
 * - On resolve:
 *     * Winner gets the whole pool = amountCents + acceptorStakeCents.
 *     * Loser gets nothing (they were already debited at propose/accept).
 * - On push/void: each side is refunded their own escrow.
 */
@Service
public class SettlementService {

    private static final String STATUS_ACCEPTED = "ACCEPTED";
    private static final String STATUS_RESOLVED = "RESOLVED";
    private static final String STATUS_VOID     = "VOID";

    private final GameRepository gameRepo;
    private final BetRepository betRepo;
    private final WalletService walletService;

    public SettlementService(GameRepository gameRepo, BetRepository betRepo, WalletService walletService) {
        this.gameRepo = gameRepo;
        this.betRepo  = betRepo;
        this.walletService = walletService;
    }

    /** Mark a game's final score and immediately settle all bets on it. */
    @Transactional
    public int setFinalScore(UUID gameId, int homeScore, int awayScore) {
        Game g = gameRepo.findById(gameId).orElseThrow();
        g.setHomeScore(homeScore);
        g.setAwayScore(awayScore);
        g.setFinal(true);
        g.setFinalAt(Instant.now());
        gameRepo.save(g);

        return settleGame(gameId);
    }

    /** Settle all ACCEPTED bets for an already-final game. Idempotent. */
    @Transactional
    public int settleGame(UUID gameId) {
        Game g = gameRepo.findById(gameId).orElseThrow();
        if (!g.isFinal() || g.getHomeScore() == null || g.getAwayScore() == null) return 0;

        // Use pessimistic locking to prevent double settlement from concurrent calls
        List<Bet> allOnGame = betRepo.findByGameIdForUpdate(gameId);
        int settled = 0;

        for (Bet b : allOnGame) {
            String st = String.valueOf(b.getStatus());
            if (!STATUS_ACCEPTED.equalsIgnoreCase(st)) continue; // only accepted bets

            Outcome outcome = evaluateOutcome(b, g);
            if (outcome == Outcome.NEEDS_DATA) continue; // wait until we have the spread/total line

            long proposerStake  = b.getAmountCents();
            long acceptorStake  = Optional.ofNullable(b.getAcceptorStakeCents()).orElse(0L);
            long poolCents      = safeAdd(proposerStake, acceptorStake);

            UUID groupId   = b.getGroupId();
            UUID proposer  = b.getProposerId();
            UUID acceptor  = b.getAcceptorId();

            if (acceptor == null) {
                // Defensive: refund proposer if somehow ACCEPTED without a counterparty
                walletService.deposit(groupId, new WalletDepositRequest(proposer, proposerStake));
                b.setStatus(STATUS_VOID);
                upsertSettlementDetails(b, g, outcome, null, null, 0, 0, proposerStake, 0, "No counterparty; void.");
                finalizeAndSave(b);
                settled++;
                continue;
            }

            switch (outcome) {
                case PUSH -> {
                    // Refund both sides
                    walletService.deposit(groupId, new WalletDepositRequest(proposer, proposerStake));
                    walletService.deposit(groupId, new WalletDepositRequest(acceptor, acceptorStake));
                    b.setStatus(STATUS_VOID);
                    upsertSettlementDetails(b, g, outcome, null, null, 0, poolCents, proposerStake, acceptorStake, "Push: no winner.");
                }
                case PROPOSER_WIN -> {
                    walletService.deposit(groupId, new WalletDepositRequest(proposer, poolCents));
                    b.setStatus(STATUS_RESOLVED);
                    upsertSettlementDetails(b, g, outcome, proposer, acceptor, poolCents, 0, 0, 0, null);
                }
                case ACCEPTOR_WIN -> {
                    walletService.deposit(groupId, new WalletDepositRequest(acceptor, poolCents));
                    b.setStatus(STATUS_RESOLVED);
                    upsertSettlementDetails(b, g, outcome, acceptor, proposer, poolCents, 0, 0, 0, null);
                }
            }

            finalizeAndSave(b);
            settled++;
        }

        return settled;
    }

    /**
     * Settle all accepted bets within a group by iterating over each game's settlement.
     * Returns the total number of bets settled (matches {@link #settleGame(UUID)} semantics).
     */
    @Transactional
    public int settleAcceptedBetsForGroup(UUID groupId) {
        List<Bet> accepted = betRepo.findAllByGroupIdAndStatus(groupId, STATUS_ACCEPTED);
        if (accepted.isEmpty()) {
            return 0;
        }

        Set<UUID> gameIds = new LinkedHashSet<>();
        for (Bet b : accepted) {
            UUID gameId = b.getGameId();
            if (gameId != null) {
                gameIds.add(gameId);
            }
        }

        int totalSettled = 0;
        for (UUID gameId : gameIds) {
            totalSettled += settleGame(gameId);
        }
        return totalSettled;
    }

    // ---------- Outcome evaluation ----------

    private enum Outcome {
        PROPOSER_WIN,
        ACCEPTOR_WIN,
        PUSH,
        NEEDS_DATA // missing line/spread etc.
    }

    private Outcome evaluateOutcome(Bet b, Game g) {
        String market = Optional.ofNullable(b.getMarketType()).orElse("").toUpperCase(Locale.ROOT);
        String pick   = Optional.ofNullable(b.getPick()).orElse("").toUpperCase(Locale.ROOT);

        int home = g.getHomeScore();
        int away = g.getAwayScore();

        switch (market) {
            case "WINNER": {
                if (home == away) return Outcome.PUSH; // ties => push
                String actual = home > away ? "HOME" : "AWAY";
                return actual.equals(pick) ? Outcome.PROPOSER_WIN : Outcome.ACCEPTOR_WIN;
            }
            case "SPREAD": {
                Double spread = getDouble(b.getDetails(), "spreadPoints");
                if (spread == null) return Outcome.NEEDS_DATA;

                if ("HOME".equals(pick)) {
                    double adjHome = home + spread;
                    if (adjHome > away) return Outcome.PROPOSER_WIN;
                    if (adjHome < away) return Outcome.ACCEPTOR_WIN;
                    return Outcome.PUSH;
                } else if ("AWAY".equals(pick)) {
                    double adjAway = away + spread;
                    if (adjAway > home) return Outcome.PROPOSER_WIN;
                    if (adjAway < home) return Outcome.ACCEPTOR_WIN;
                    return Outcome.PUSH;
                } else {
                    return Outcome.NEEDS_DATA;
                }
            }
            case "TOTALS": {
                Double line = getDouble(b.getDetails(), "totalLine");
                if (line == null) return Outcome.NEEDS_DATA;
                int total = home + away;
                if (total > line) {
                    return "OVER".equals(pick) ? Outcome.PROPOSER_WIN : Outcome.ACCEPTOR_WIN;
                } else if (total < line) {
                    return "UNDER".equals(pick) ? Outcome.PROPOSER_WIN : Outcome.ACCEPTOR_WIN;
                } else {
                    return Outcome.PUSH;
                }
            }
            default:
                return Outcome.NEEDS_DATA;
        }
    }

    // ---------- Helpers ----------

    private static long safeAdd(long a, long b) {
        // keep it simple; pool can't exceed a few billion cents
        return a + b;
    }

    private Double getDouble(Map<String, Object> details, String key) {
        if (details == null) return null;
        Object v = details.get(key);
        if (v == null) return null;
        if (v instanceof Number n) return n.doubleValue();
        try {
            return Double.parseDouble(String.valueOf(v));
        } catch (Exception e) {
            return null;
        }
    }

    private void upsertSettlementDetails(
            Bet b,
            Game g,
            Outcome outcome,
            UUID winnerUserId,
            UUID loserUserId,
            long payoutCents,
            long pushRefundTotalCents,
            long refundedProposerCents,
            long refundedAcceptorCents,
            String note
    ) {
        Map<String, Object> details = b.getDetails();
        if (details == null) details = new HashMap<>();
        Map<String, Object> settlement = new LinkedHashMap<>();
        settlement.put("outcome", outcome.name());
        settlement.put("homeScore", g.getHomeScore());
        settlement.put("awayScore", g.getAwayScore());
        settlement.put("totalPoints", g.getHomeScore() + g.getAwayScore());
        settlement.put("winnerUserId", winnerUserId != null ? winnerUserId.toString() : null);
        settlement.put("loserUserId", loserUserId != null ? loserUserId.toString() : null);
        settlement.put("payoutCents", payoutCents); // winner payout if any
        settlement.put("pushRefundTotalCents", pushRefundTotalCents);
        settlement.put("refundedProposerCents", refundedProposerCents);
        settlement.put("refundedAcceptorCents", refundedAcceptorCents);
        settlement.put("settledAt", Instant.now().toString());
        if (note != null) settlement.put("note", note);

        details.put("settlement", settlement);
        b.setDetails(details);
    }

    private void finalizeAndSave(Bet b) {
        safeSetResolvedAt(b, Instant.now());
        betRepo.save(b);
    }

    private void safeSetResolvedAt(Bet b, Instant when) {
        try {
            var m = b.getClass().getMethod("setResolvedAt", Instant.class);
            m.invoke(b, when);
        } catch (Throwable ignored) {
        }
    }
}
