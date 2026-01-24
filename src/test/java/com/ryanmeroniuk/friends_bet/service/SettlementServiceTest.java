package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.dto.WalletDepositRequest;
import com.ryanmeroniuk.friends_bet.dto.WalletResponse;
import com.ryanmeroniuk.friends_bet.model.Bet;
import com.ryanmeroniuk.friends_bet.model.Game;
import com.ryanmeroniuk.friends_bet.repository.BetRepository;
import com.ryanmeroniuk.friends_bet.repository.GameRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SettlementServiceTest {

    @Mock
    private GameRepository gameRepo;

    @Mock
    private BetRepository betRepo;

    @Mock
    private WalletService walletService;

    @InjectMocks
    private SettlementService settlementService;

    private static final UUID GROUP_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    @BeforeEach
    void stubs() {
        when(betRepo.save(any(Bet.class))).thenAnswer(inv -> inv.getArgument(0));
        when(walletService.deposit(any(), any())).thenAnswer(invocation -> {
            WalletDepositRequest req = invocation.getArgument(1);
            return new WalletResponse(req.getUserId(), req.getAmountCents());
        });
    }

    @Test
    void settleGame_winnerMarket_proposerWinsPool() {
        UUID gameId = UUID.randomUUID();
        UUID proposer = UUID.randomUUID();
        UUID acceptor = UUID.randomUUID();

        Game game = finalGame(gameId, 31, 20);
        Bet bet = acceptedBet(GROUP_ID, gameId, proposer, acceptor, "WINNER", "HOME",
                1_000L, 500L, new HashMap<>());
        mockGameAndBets(game, bet);

        int settled = settlementService.settleGame(gameId);

        assertEquals(1, settled);
        assertEquals("RESOLVED", bet.getStatus());
        Map<String, Object> settlement = settlement(bet);
        assertEquals("PROPOSER_WIN", settlement.get("outcome"));
        assertEquals(proposer.toString(), settlement.get("winnerUserId"));
        assertEquals(acceptor.toString(), settlement.get("loserUserId"));
        assertEquals(1_500L, settlement.get("payoutCents"));
        assertEquals(0L, settlement.get("pushRefundTotalCents"));
        assertNotNull(bet.getResolvedAt());

        verify(walletService).deposit(eq(GROUP_ID),
                argThat(req -> proposer.equals(req.getUserId()) && req.getAmountCents() == 1_500L));
        verifyNoMoreInteractions(walletService);
    }

    @Test
    void settleGame_winnerMarket_pushRefundsBothSides() {
        UUID gameId = UUID.randomUUID();
        UUID proposer = UUID.randomUUID();
        UUID acceptor = UUID.randomUUID();

        Game game = finalGame(gameId, 21, 21);
        Bet bet = acceptedBet(GROUP_ID, gameId, proposer, acceptor, "WINNER", "HOME",
                2_000L, 800L, new HashMap<>());
        mockGameAndBets(game, bet);

        int settled = settlementService.settleGame(gameId);

        assertEquals(1, settled);
        assertEquals("VOID", bet.getStatus());
        Map<String, Object> settlement = settlement(bet);
        assertEquals("PUSH", settlement.get("outcome"));
        assertEquals(2_800L, settlement.get("pushRefundTotalCents"));
        assertEquals(2_000L, settlement.get("refundedProposerCents"));
        assertEquals(800L, settlement.get("refundedAcceptorCents"));

        ArgumentCaptor<WalletDepositRequest> captor = ArgumentCaptor.forClass(WalletDepositRequest.class);
        verify(walletService, times(2)).deposit(eq(GROUP_ID), captor.capture());
        List<WalletDepositRequest> deposits = captor.getAllValues();
        assertTrue(deposits.stream().anyMatch(req -> proposer.equals(req.getUserId()) && req.getAmountCents() == 2_000L));
        assertTrue(deposits.stream().anyMatch(req -> acceptor.equals(req.getUserId()) && req.getAmountCents() == 800L));
    }

    @Test
    void settleGame_spreadMissingLine_defersSettlement() {
        UUID gameId = UUID.randomUUID();
        UUID proposer = UUID.randomUUID();
        UUID acceptor = UUID.randomUUID();

        Game game = finalGame(gameId, 27, 24);
        Bet bet = acceptedBet(GROUP_ID, gameId, proposer, acceptor, "SPREAD", "HOME",
                1_500L, 600L, new HashMap<>());
        mockGameAndBets(game, bet);

        int settled = settlementService.settleGame(gameId);

        assertEquals(0, settled);
        assertEquals("ACCEPTED", bet.getStatus());
        assertNull(settlement(bet));
        verify(betRepo, never()).save(any(Bet.class));
        verifyNoInteractions(walletService);
    }

    @Test
    void settleGame_totals_acceptorWinsPool() {
        UUID gameId = UUID.randomUUID();
        UUID proposer = UUID.randomUUID();
        UUID acceptor = UUID.randomUUID();

        Game game = finalGame(gameId, 17, 13); // total = 30 < line 40 => UNDER wins
        Map<String, Object> details = new HashMap<>();
        details.put("totalLine", 40);
        Bet bet = acceptedBet(GROUP_ID, gameId, proposer, acceptor, "TOTALS", "OVER",
                3_000L, 1_200L, details);
        mockGameAndBets(game, bet);

        int settled = settlementService.settleGame(gameId);

        assertEquals(1, settled);
        assertEquals("RESOLVED", bet.getStatus());
        Map<String, Object> settlement = settlement(bet);
        assertEquals("ACCEPTOR_WIN", settlement.get("outcome"));
        assertEquals(acceptor.toString(), settlement.get("winnerUserId"));
        assertEquals(4_200L, settlement.get("payoutCents"));

        verify(walletService).deposit(eq(GROUP_ID),
                argThat(req -> acceptor.equals(req.getUserId()) && req.getAmountCents() == 4_200L));
    }

    @Test
    void settleGame_voidsWithoutAcceptor() {
        UUID gameId = UUID.randomUUID();
        UUID proposer = UUID.randomUUID();

        Game game = finalGame(gameId, 14, 10);
        Bet bet = acceptedBet(GROUP_ID, gameId, proposer, null, "WINNER", "AWAY",
                900L, 0L, new HashMap<>());
        mockGameAndBets(game, bet);

        int settled = settlementService.settleGame(gameId);

        assertEquals(1, settled);
        assertEquals("VOID", bet.getStatus());
        Map<String, Object> settlement = settlement(bet);
        assertEquals("ACCEPTOR_WIN", settlement.get("outcome")); // recorded outcome even when voided
        assertEquals(900L, settlement.get("refundedProposerCents"));
        assertEquals(0L, settlement.get("refundedAcceptorCents"));
        assertEquals("No counterparty; void.", settlement.get("note"));

        verify(walletService).deposit(eq(GROUP_ID),
                argThat(req -> proposer.equals(req.getUserId()) && req.getAmountCents() == 900L));
        verifyNoMoreInteractions(walletService);
    }

    private Map<String, Object> settlement(Bet bet) {
        Map<String, Object> details = bet.getDetails();
        if (details == null) return null;
        Object settlement = details.get("settlement");
        return settlement instanceof Map ? (Map<String, Object>) settlement : null;
    }

    private void mockGameAndBets(Game game, Bet... bets) {
        when(gameRepo.findById(game.getId())).thenReturn(Optional.of(game));
        when(betRepo.findByGameIdForUpdate(game.getId())).thenReturn(List.of(bets));
    }

    private Game finalGame(UUID id, int homeScore, int awayScore) {
        Game g = new Game("ext-" + id, "HOME_TEAM", "AWAY_TEAM", Instant.now());
        g.setId(id);
        g.setHomeScore(homeScore);
        g.setAwayScore(awayScore);
        g.setFinal(true);
        g.setFinalAt(Instant.now());
        return g;
    }

    private Bet acceptedBet(UUID groupId,
                            UUID gameId,
                            UUID proposerId,
                            UUID acceptorId,
                            String market,
                            String pick,
                            long proposerStake,
                            long acceptorStake,
                            Map<String, Object> details) {
        Bet b = new Bet();
        b.setId(UUID.randomUUID());
        b.setGroupId(groupId);
        b.setGameId(gameId);
        b.setProposerId(proposerId);
        b.setAcceptorId(acceptorId);
        b.setMarketType(market);
        b.setPick(pick);
        b.setAmountCents(proposerStake);
        b.setAcceptorStakeCents(acceptorStake);
        b.setOdds(1.5);
        b.setStatus("ACCEPTED");
        b.setCreatedAt(Instant.now());
        b.setDetails(details == null ? new HashMap<>() : new HashMap<>(details));
        return b;
    }
}
