package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.dto.AcceptBetRequest;
import com.ryanmeroniuk.friends_bet.dto.BetResponse;
import com.ryanmeroniuk.friends_bet.dto.CreateBetRequest;
import com.ryanmeroniuk.friends_bet.model.Bet;
import com.ryanmeroniuk.friends_bet.model.Game;
import com.ryanmeroniuk.friends_bet.model.Group;
import com.ryanmeroniuk.friends_bet.model.User;
import com.ryanmeroniuk.friends_bet.repository.BetRepository;
import com.ryanmeroniuk.friends_bet.repository.GameRepository;
import com.ryanmeroniuk.friends_bet.repository.GroupRepository;
import com.ryanmeroniuk.friends_bet.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ryanmeroniuk.friends_bet.dto.WalletDepositRequest;
import com.ryanmeroniuk.friends_bet.service.WalletService;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

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
        Group group = groupRepo.findById(req.getGroupId())
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));
        User proposer = userRepo.findById(req.getProposerId())
                .orElseThrow(() -> new IllegalArgumentException("Proposer not found"));

        Game game = gameRepo.findById(req.getGameId())
                .orElseThrow(() -> new IllegalArgumentException("Game not found"));

        Bet bet = new Bet(
                group, proposer,
                game, req.getMarketType(), req.getPick(),
                req.getAmountCents(), req.getOdds()
        );
        Bet saved = betRepo.save(bet);
        return toDto(saved);
    }

    /** Accept an existing open bet. */
    @Transactional
    public BetResponse accept(UUID betId, AcceptBetRequest req) {
        Bet bet = betRepo.findById(betId)
                .orElseThrow(() -> new IllegalArgumentException("Bet not found"));
        if (!"OPEN".equals(bet.getStatus())) {
            throw new IllegalArgumentException("Cannot accept bet in status: " + bet.getStatus());
        }

        User acceptor = userRepo.findById(req.getAcceptorId())
                .orElseThrow(() -> new IllegalArgumentException("Acceptor not found"));

        // debit proposers stake
        walletService.deposit(bet.getGroup().getId(), new WalletDepositRequest(bet.getProposer().getId(), -bet.getAmountCents()));

        // debit acceptor stake
        walletService.deposit(bet.getGroup().getId(), new WalletDepositRequest(acceptor.getId(), -bet.getAmountCents()));

        // mark bet accepted
        bet.setAcceptor(acceptor);
        bet.setStatus("ACCEPTED");
        Bet updated = betRepo.save(bet);
        return toDto(updated);
    }

    /** List all bets for a group. */
    public List<BetResponse> listByGroup(UUID groupId) {
        Group group = groupRepo.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));

        return betRepo.findAllByGroup(group).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private BetResponse toDto(Bet bet) {
        return new BetResponse(
                bet.getId(),
                bet.getGroup().getId(),
                bet.getProposer().getId(),
                bet.getAcceptor() != null ? bet.getAcceptor().getId() : null,
                bet.getGame().getId(),
                bet.getMarketType(),
                bet.getPick(),
                bet.getAmountCents(),
                bet.getOdds(),
                bet.getStatus(),
                bet.getCreatedAt(),
                bet.getResolvedAt()
        );
    }

    /**
     * Every minute: find all ACCEPTED bets whose game.startTime is in the past,
     * determine a winner, and transfer funds accordingly.
     */
    @Scheduled(fixedRate = 60_000)
    @Transactional
    public void settleBets() {
        Instant now = Instant.now();

        // 1) Fetch all accepted bets
        List<Bet> toSettle = betRepo.findAll().stream()
                .filter(b -> "ACCEPTED".equals(b.getStatus()))
                .filter(b -> b.getGame().getStartTime().isBefore(now))
                .collect(Collectors.toList());

        for (Bet bet : toSettle) {
            // 2) Determine winner (stub—replace with real result lookup)
            UUID winnerId = determineWinner(bet);

            // 3) Calculate payout: stake * odds
            long payoutCents = Math.round(bet.getAmountCents() * bet.getOdds());

            // 4) Transfer funds: credit winner
            walletService.deposit(
                    bet.getGroup().getId(),
                    new WalletDepositRequest(winnerId, payoutCents)
            );

            // 5) Mark bet as resolved
            bet.setStatus("RESOLVED");
            bet.setResolvedAt(now);
            betRepo.save(bet);
        }
    }

    /**
     * Stub for determining winner—swap in real result checking.
     */
    private UUID determineWinner(Bet bet) {
        // For now, random:
        return Math.random() < 0.5
                ? bet.getProposer().getId()
                : bet.getAcceptor().getId();
    }
}
