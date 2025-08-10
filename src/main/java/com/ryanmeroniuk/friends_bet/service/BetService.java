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
import com.ryanmeroniuk.friends_bet.repository.GroupRepository;
import com.ryanmeroniuk.friends_bet.repository.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
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

    /** Propose a new bet in a group. */
    @Transactional
    public BetResponse propose(CreateBetRequest req) {
        // Basic existence validation (cheap)
        if (req.getGroupId() == null) throw new IllegalArgumentException("groupId is required");
        if (req.getProposerId() == null) throw new IllegalArgumentException("proposerId is required");
        if (req.getGameId() == null) throw new IllegalArgumentException("gameId is required");

        if (!groupRepo.existsById(req.getGroupId())) {
            throw new IllegalArgumentException("Group not found");
        }
        if (!userRepo.existsById(req.getProposerId())) {
            throw new IllegalArgumentException("Proposer not found");
        }
        if (!gameRepo.existsById(req.getGameId())) {
            throw new IllegalArgumentException("Game not found");
        }

        Bet bet = BetMapper.fromCreate(req.getGroupId(), req);
        Bet saved = betRepo.save(bet);
        return BetMapper.toResponse(saved);
    }

    /** Accept an existing open bet. */
    @Transactional
    public BetResponse accept(UUID betId, AcceptBetRequest req) {
        Bet bet = betRepo.findById(betId)
                .orElseThrow(() -> new IllegalArgumentException("Bet not found"));

        if (!"OPEN".equals(bet.getStatus())) {
            throw new IllegalArgumentException("Cannot accept bet in status: " + bet.getStatus());
        }
        if (req.getAcceptorId() == null) {
            throw new IllegalArgumentException("acceptorId is required");
        }
        if (!userRepo.existsById(req.getAcceptorId())) {
            throw new IllegalArgumentException("Acceptor not found");
        }

        // debit proposer's stake
        walletService.deposit(
                bet.getGroupId(),
                new WalletDepositRequest(bet.getProposerId(), -bet.getAmountCents())
        );

        // debit acceptor's stake
        walletService.deposit(
                bet.getGroupId(),
                new WalletDepositRequest(req.getAcceptorId(), -bet.getAmountCents())
        );

        // mark bet accepted
        bet.setAcceptorId(req.getAcceptorId());
        bet.setStatus("ACCEPTED");
        Bet updated = betRepo.save(bet);

        return BetMapper.toResponse(updated);
    }

    /** List all bets for a group. */
    public List<BetResponse> listByGroup(UUID groupId) {
        if (!groupRepo.existsById(groupId)) {
            throw new IllegalArgumentException("Group not found");
        }
        // NOTE: update BetRepository to have: List<Bet> findAllByGroupId(UUID groupId);
        return BetMapper.toResponse(betRepo.findAllByGroupId(groupId));
    }

    /**
     * Every minute: find all ACCEPTED bets whose game.startTime is in the past,
     * determine a winner, and transfer funds accordingly.
     */
    @Scheduled(fixedRate = 60_000)
    @Transactional
    public void settleBets() {
        Instant now = Instant.now();

        // Pull all bets (keep simple for now); you can add a repo method to filter by status if you like.
        for (Bet bet : betRepo.findAll()) {
            if (!"ACCEPTED".equals(bet.getStatus())) continue;

            // Load the game to check start time (no relation on Bet anymore)
            Game game = gameRepo.findById(bet.getGameId()).orElse(null);
            if (game == null || game.getStartTime() == null) continue;
            if (game.getStartTime().isAfter(now)) continue;

            // Determine winner (stub)
            UUID winnerId = determineWinner(bet);
            if (winnerId == null) continue;

            long payoutCents = Math.round(bet.getAmountCents() * bet.getOdds());

            walletService.deposit(
                    bet.getGroupId(),
                    new WalletDepositRequest(winnerId, payoutCents)
            );

            bet.setStatus("RESOLVED");
            bet.setResolvedAt(now);
            betRepo.save(bet);
        }
    }

    /** Stub for determining winner—replace with real logic. */
    private UUID determineWinner(Bet bet) {
        if (bet.getAcceptorId() == null) return bet.getProposerId();
        return Math.random() < 0.5 ? bet.getProposerId() : bet.getAcceptorId();
    }
}
