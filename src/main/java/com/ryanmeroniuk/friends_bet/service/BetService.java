package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.dto.AcceptBetRequest;
import com.ryanmeroniuk.friends_bet.dto.BetMapper;
import com.ryanmeroniuk.friends_bet.dto.BetResponse;
import com.ryanmeroniuk.friends_bet.dto.CreateBetRequest;
import com.ryanmeroniuk.friends_bet.dto.WalletDepositRequest;
import com.ryanmeroniuk.friends_bet.model.Bet;
import com.ryanmeroniuk.friends_bet.model.Game;
import com.ryanmeroniuk.friends_bet.repository.BetRepository;
import com.ryanmeroniuk.friends_bet.repository.GameRepository;
import com.ryanmeroniuk.friends_bet.repository.GroupMemberRepository;
import com.ryanmeroniuk.friends_bet.repository.GroupRepository;
import com.ryanmeroniuk.friends_bet.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class BetService {
    private static final Set<String> SETTLEABLE_MARKETS = Set.of("WINNER", "SPREAD", "TOTALS");

    private final BetRepository betRepo;
    private final GroupRepository groupRepo;
    private final UserRepository userRepo;
    private final WalletService walletService;
    private final GameRepository gameRepo;
    private final GroupMemberRepository groupMemberRepo;

    public BetService(
            BetRepository betRepo,
            GroupRepository groupRepo,
            UserRepository userRepo,
            WalletService walletService,
            GameRepository gameRepo,
            GroupMemberRepository groupMemberRepo
    ) {
        this.betRepo = betRepo;
        this.groupRepo = groupRepo;
        this.userRepo = userRepo;
        this.walletService = walletService;
        this.gameRepo = gameRepo;
        this.groupMemberRepo = groupMemberRepo;
    }

    /** Propose a new bet: escrow proposer only. */
    @Transactional
    public BetResponse propose(CreateBetRequest req) {
        UUID actor = currentUserId();
        if (req.getProposerId() != null && !actor.equals(req.getProposerId())) {
            throw new IllegalArgumentException("Proposer must be the authenticated user");
        }
        req.setProposerId(actor);

        // 0) Cheap guards
        if (req.getAmountCents() <= 0) throw new IllegalArgumentException("amountCents must be > 0");
        if (req.getOdds() <= 1.0)      throw new IllegalArgumentException("odds must be > 1.0");
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

        // 1a) Must be a member of the group
        if (!groupMemberRepo.existsByGroup_IdAndUser_Id(req.getGroupId(), req.getProposerId())) {
            throw new IllegalArgumentException("Proposer is not a member of the group");
        }

        // 1b) Do not allow proposing after game start
        if (game.getStartTime() != null && Instant.now().isAfter(game.getStartTime())) {
            throw new IllegalArgumentException("Game already started");
        }

        // (Optional) keep cutoff before game start
        if (req.getCutoffTime() != null && game.getStartTime() != null
                && req.getCutoffTime().isAfter(game.getStartTime())) {
            throw new IllegalArgumentException("cutoffTime must be ≤ game start time");
        }

        // 2) Normalize inputs
        String market = normalizeMarket(req.getMarketType());
        if (!SETTLEABLE_MARKETS.contains(market)) {
            throw new IllegalArgumentException("Unsupported market type: " + market);
        }
        String pick = BetPicks.canonical(market, req.getPick(), game);
        if (pick == null) {
            throw new IllegalArgumentException("Invalid pick for " + market + ": " + req.getPick());
        }

        // 3) Ensure funds & escrow proposer stake (debit)
        // If your WalletService already blocks negative balances inside deposit(), you can omit this check.
        // Otherwise uncomment the next line and implement getBalance/ensure in WalletService.
        // walletService.ensureSufficientBalance(req.getGroupId(), req.getProposerId(), req.getAmountCents());

        walletService.deposit(
                req.getGroupId(),
                new WalletDepositRequest(req.getProposerId(), -req.getAmountCents()),
                "BET_PROPOSE"
        );

        // 4) Persist bet
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
        UUID actor = currentUserId();
        if (req.getAcceptorId() != null && !actor.equals(req.getAcceptorId())) {
            throw new IllegalArgumentException("Acceptor must be the authenticated user");
        }
        req.setAcceptorId(actor);

        // Use pessimistic locking to prevent two users from accepting the same bet
        Bet bet = betRepo.findByIdForUpdate(betId)
                .orElseThrow(() -> new IllegalArgumentException("Bet not found"));

        if (!"OPEN".equals(bet.getStatus())) {
            throw new IllegalArgumentException("Cannot accept bet in status: " + bet.getStatus());
        }
        if (bet.getCutoffTime() != null && Instant.now().isAfter(bet.getCutoffTime())) {
            throw new IllegalArgumentException("Bet is closed for accepting");
        }
        if (actor.equals(bet.getProposerId())) {
            throw new IllegalArgumentException("Proposer cannot accept own bet");
        }

        // Must be a member of the group
        if (!groupMemberRepo.existsByGroup_IdAndUser_Id(bet.getGroupId(), actor)) {
            throw new IllegalArgumentException("Acceptor is not a member of the group");
        }

        long proposerStake = bet.getAmountCents();
        long acceptorStake = calcAcceptorStake(proposerStake, bet.getOdds());

        walletService.deposit(
                bet.getGroupId(),
                new WalletDepositRequest(actor, -acceptorStake),
                "BET_ACCEPT"
        );

        bet.setAcceptorId(actor);
        bet.setAcceptorStakeCents(acceptorStake);
        bet.setStatus("ACCEPTED");

        Bet updated = betRepo.save(bet);
        return BetMapper.toResponse(updated);
    }

    /** List all bets for a group. */
    public List<BetResponse> listByGroup(UUID groupId) {
        groupRepo.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));
        UUID actor = currentUserId();
        if (!groupMemberRepo.existsByGroup_IdAndUser_Id(groupId, actor)) {
            throw new IllegalArgumentException("Not a member of this group");
        }
        return BetMapper.toResponse(betRepo.findAllByGroupId(groupId));
    }

    /** Ensure the given group exists and the authenticated user is a member. */
    public void ensureGroupExistsAndMember(UUID groupId) {
        if (!groupRepo.existsById(groupId)) {
            throw new IllegalArgumentException("Group not found");
        }
        UUID actor = currentUserId();
        if (!groupMemberRepo.existsByGroup_IdAndUser_Id(groupId, actor)) {
            throw new IllegalArgumentException("Not a member of this group");
        }
    }

    /** Ensure the given group exists or throw IllegalArgumentException for consistency. */
    public void ensureGroupExists(UUID groupId) {
        if (!groupRepo.existsById(groupId)) {
            throw new IllegalArgumentException("Group not found");
        }
    }

    /**
     * Find unique sport keys for all ACCEPTED bets in the given group.
     * Used to trigger score sync for the relevant sports before settlement runs.
     */
    public Set<String> sportsForAcceptedBets(UUID groupId) {
        List<Bet> accepted = betRepo.findAllByGroupIdAndStatus(groupId, "ACCEPTED");
        if (accepted.isEmpty()) {
            return Set.of();
        }

        Set<UUID> gameIds = new LinkedHashSet<>();
        for (Bet b : accepted) {
            UUID gameId = b.getGameId();
            if (gameId != null) {
                gameIds.add(gameId);
            }
        }

        if (gameIds.isEmpty()) {
            return Set.of();
        }

        Set<String> sports = new LinkedHashSet<>();
        for (Game g : gameRepo.findAllById(gameIds)) {
            String sport = g.getSport();
            if (sport != null && !sport.isBlank()) {
                sports.add(sport);
            }
        }
        return sports;
    }

    // ---------- Helpers ----------

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

    /**
     * Cancel an OPEN bet — only the proposer can cancel, and stake is refunded.
     */
    @Transactional
    public BetResponse cancel(UUID betId) {
        UUID actor = currentUserId();
        Bet bet = betRepo.findByIdForUpdate(betId)
                .orElseThrow(() -> new IllegalArgumentException("Bet not found"));

        if (!"OPEN".equals(bet.getStatus())) {
            throw new IllegalArgumentException("Only OPEN bets can be cancelled");
        }
        if (!actor.equals(bet.getProposerId())) {
            throw new IllegalArgumentException("Only the proposer can cancel their bet");
        }

        // Refund proposer stake
        walletService.deposit(
                bet.getGroupId(),
                new WalletDepositRequest(actor, bet.getAmountCents()),
                "BET_REFUND"
        );

        bet.setStatus("VOID");
        bet.setResolvedAt(Instant.now());
        Map<String, Object> details = bet.getDetails() != null ? bet.getDetails() : new java.util.HashMap<>();
        details.put("cancelledBy", actor.toString());
        bet.setDetails(details);

        return BetMapper.toResponse(betRepo.save(bet));
    }

    private UUID currentUserId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByUsername(username)
                .map(u -> u.getId())
                .orElseThrow(() -> new IllegalArgumentException("Auth user not found"));
    }
}
