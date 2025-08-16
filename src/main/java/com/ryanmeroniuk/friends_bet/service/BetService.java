package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.dto.*;
import com.ryanmeroniuk.friends_bet.model.Bet;
import com.ryanmeroniuk.friends_bet.model.Game;
import com.ryanmeroniuk.friends_bet.repository.BetRepository;
import com.ryanmeroniuk.friends_bet.repository.GameRepository;
import com.ryanmeroniuk.friends_bet.repository.GroupRepository;
import com.ryanmeroniuk.friends_bet.repository.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class BetService {
    private final BetRepository betRepo;
    private final GroupRepository groupRepo;
    private final UserRepository userRepo;
    private final WalletService walletService;
    private final GameRepository gameRepo;

    public BetService(
            BetRepository betRepo,
            GroupRepository groupRepo,
            UserRepository userRepo,
            WalletService walletService,
            GameRepository gameRepo
    ) {
        this.betRepo = betRepo;
        this.groupRepo = groupRepo;
        this.userRepo = userRepo;
        this.walletService = walletService;
        this.gameRepo = gameRepo;
    }

    /** Propose a new bet: escrow proposer only. */
    @Transactional
    public BetResponse propose(CreateBetRequest req) {
        // 0) Cheap guards first (no DB/work if invalid)
        if (req.getAmountCents() <= 0) {
            throw new IllegalArgumentException("amountCents must be > 0");
        }
        if (req.getOdds() <= 1.0) {
            throw new IllegalArgumentException("odds must be > 1.0");
        }
        if (req.getCutoffTime() != null && req.getCutoffTime().isBefore(Instant.now())) {
            throw new IllegalArgumentException("cutoffTime must be in the future");
        }

        // 1) Validate existence
        groupRepo.findById(req.getGroupId())
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));
        userRepo.findById(req.getProposerId())
                .orElseThrow(() -> new IllegalArgumentException("Proposer not found"));
        Game game = gameRepo.findById(req.getGameId())
                .orElseThrow(() -> new IllegalArgumentException("Game not found"));

        // (Optional) keep cutoff before game start
        if (req.getCutoffTime() != null && game.getStartTime() != null
                && req.getCutoffTime().isAfter(game.getStartTime())) {
            throw new IllegalArgumentException("cutoffTime must be ≤ game start time");
        }

        // 2) Normalize inputs
        String market = normalizeMarket(req.getMarketType());
        String pick = (req.getPick() == null) ? "" : req.getPick().trim().toUpperCase();

        // 3) Escrow proposer stake (debit)
        walletService.deposit(
                req.getGroupId(),
                new WalletDepositRequest(req.getProposerId(), -req.getAmountCents())
        );

        // 4) Create and persist bet
        Bet b = new Bet();
        b.setGroupId(req.getGroupId());
        b.setGameId(req.getGameId());
        b.setProposerId(req.getProposerId());
        b.setMarketType(market);
        b.setPick(pick);
        b.setAmountCents(req.getAmountCents());
        b.setAcceptorStakeCents(0L);
        b.setOdds(req.getOdds());
        b.setStatus("OPEN");
        b.setDetails(req.getDetails() == null ? Map.of() : req.getDetails());
        b.setCutoffTime(req.getCutoffTime());

        Bet saved = betRepo.save(b);
        return BetMapper.toResponse(saved);
    }

    /** Accept: escrow acceptor only (A*(odds-1)), set acceptor & move to ACCEPTED. */
    @Transactional
    public BetResponse accept(UUID betId, AcceptBetRequest req) {
        Bet bet = betRepo.findById(betId)
                .orElseThrow(() -> new IllegalArgumentException("Bet not found"));
        if (!"OPEN".equals(bet.getStatus())) {
            throw new IllegalArgumentException("Cannot accept bet in status: " + bet.getStatus());
        }
        if (bet.getCutoffTime() != null && Instant.now().isAfter(bet.getCutoffTime())) {
            throw new IllegalArgumentException("Bet is closed for accepting");
        }
        UUID acceptorId = req.getAcceptorId();
        if (acceptorId == null) throw new IllegalArgumentException("Acceptor required");
        userRepo.findById(acceptorId)
                .orElseThrow(() -> new IllegalArgumentException("Acceptor not found"));
        if (acceptorId.equals(bet.getProposerId())) {
            throw new IllegalArgumentException("Proposer cannot accept own bet");
        }

        long proposerStake = bet.getAmountCents();
        long acceptorStake = calcAcceptorStake(proposerStake, bet.getOdds());

        // Escrow acceptor stake
        walletService.deposit(
                bet.getGroupId(),
                new WalletDepositRequest(acceptorId, -acceptorStake)
        );

        bet.setAcceptorId(acceptorId);
        bet.setAcceptorStakeCents(acceptorStake);
        bet.setStatus("ACCEPTED");

        Bet updated = betRepo.save(bet);
        return BetMapper.toResponse(updated);
    }

    /** List all bets for a group. */
    public List<BetResponse> listByGroup(UUID groupId) {
        groupRepo.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));
        return BetMapper.toResponse(betRepo.findAllByGroupId(groupId));
    }

    /** Settle accepted bets whose games have started (stub rule). */
    @Scheduled(fixedRate = 60_000)
    @Transactional
    public void settleBets() {
        Instant now = Instant.now();
        List<Bet> accepted = betRepo.findAll().stream()
                .filter(b -> "ACCEPTED".equals(b.getStatus()))
                .toList();

        for (Bet b : accepted) {
            // Only settle if game start is in the past
            Game g = gameRepo.findById(b.getGameId()).orElse(null);
            if (g == null || g.getStartTime() == null || g.getStartTime().isAfter(now)) {
                continue;
            }

            UUID winnerId = determineWinner(b);
            if (winnerId == null) {
                // VOID – refund both stakes
                walletService.deposit(b.getGroupId(), new WalletDepositRequest(b.getProposerId(), b.getAmountCents()));
                walletService.deposit(b.getGroupId(), new WalletDepositRequest(b.getAcceptorId(), b.getAcceptorStakeCents()));
                b.setStatus("VOID");
            } else {
                long pool = b.getAmountCents() + b.getAcceptorStakeCents();
                walletService.deposit(b.getGroupId(), new WalletDepositRequest(winnerId, pool));
                b.setStatus("RESOLVED");
            }
            b.setResolvedAt(now);
            betRepo.save(b);
        }
    }



    private static long calcAcceptorStake(long proposerStake, double odds) {
        // acceptorStake = round( A * (odds - 1) )
        return BigDecimal.valueOf(proposerStake)
                .multiply(BigDecimal.valueOf(odds).subtract(BigDecimal.ONE))
                .setScale(0, RoundingMode.HALF_UP)
                .longValueExact();
    }

    private static String normalizeMarket(String mt) {
        if (mt == null) return "WINNER";
        return switch (mt.trim().toUpperCase()) {
            case "WIN", "ML", "MONEYLINE", "WINNER" -> "WINNER";
            case "SPREAD" -> "SPREAD";
            case "TOTALS", "OU", "OVER_UNDER" -> "TOTALS";
            case "PLAYER_PROP" -> "PLAYER_PROP";
            case "TEAM_PROP" -> "TEAM_PROP";
            case "SAME_GAME", "SGP" -> "SAME_GAME";
            case "PARLAY" -> "PARLAY";
            default -> mt.trim().toUpperCase();
        };
    }

    /** TEMP stub; replace with real result lookup */
    private UUID determineWinner(Bet bet) {
        if (bet.getAcceptorId() == null) return bet.getProposerId();
        return Math.random() < 0.5 ? bet.getProposerId() : bet.getAcceptorId();
    }
}
