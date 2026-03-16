package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.dto.AcceptBetRequest;
import com.ryanmeroniuk.friends_bet.dto.BetResponse;
import com.ryanmeroniuk.friends_bet.dto.CreateBetRequest;
import com.ryanmeroniuk.friends_bet.dto.WalletDepositRequest;
import com.ryanmeroniuk.friends_bet.model.Bet;
import com.ryanmeroniuk.friends_bet.model.Game;
import com.ryanmeroniuk.friends_bet.model.Group;
import com.ryanmeroniuk.friends_bet.model.User;
import com.ryanmeroniuk.friends_bet.repository.BetRepository;
import com.ryanmeroniuk.friends_bet.repository.GameRepository;
import com.ryanmeroniuk.friends_bet.repository.GroupMemberRepository;
import com.ryanmeroniuk.friends_bet.repository.GroupRepository;
import com.ryanmeroniuk.friends_bet.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class BetServiceTest {

    @Mock
    private BetRepository betRepository;

    @Mock
    private GroupRepository groupRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private WalletService walletService;

    @Mock
    private GameRepository gameRepository;

    @Mock
    private GroupMemberRepository groupMemberRepository;

    @InjectMocks
    private BetService betService;

    @BeforeEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void propose_debits_proposer_and_persists_bet() {
        UUID groupId = UUID.randomUUID();
        UUID proposerId = UUID.randomUUID();
        UUID gameId = UUID.randomUUID();
        long amountCents = 1_000;

        CreateBetRequest request = new CreateBetRequest();
        request.setGroupId(groupId);
        request.setGameId(gameId);
        request.setMarketType("WINNER");
        request.setPick("HOME");
        request.setAmountCents(amountCents);
        request.setOdds(1.5);

        Game game = new Game();
        game.setId(gameId);
        game.setStartTime(Instant.now().plusSeconds(3_600));

        Group group = new Group("Edge Case Group");

        User proposer = buildUser(proposerId, "proposer");
        authenticate(proposer);

        when(groupRepository.findById(groupId)).thenReturn(Optional.of(group));
        when(userRepository.findById(proposerId)).thenReturn(Optional.of(proposer));
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        when(groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, proposerId)).thenReturn(true);
        when(betRepository.save(any(Bet.class))).thenAnswer(invocation -> {
            Bet bet = invocation.getArgument(0);
            bet.setId(UUID.randomUUID());
            return bet;
        });

        BetResponse response = betService.propose(request);

        assertThat(response.amountCents()).isEqualTo(amountCents);
        assertThat(response.proposerId()).isEqualTo(proposerId);
        assertThat(response.status()).isEqualTo("OPEN");

        ArgumentCaptor<WalletDepositRequest> walletCaptor = ArgumentCaptor.forClass(WalletDepositRequest.class);
        verify(walletService).deposit(eq(groupId), walletCaptor.capture(), eq("BET_PROPOSE"));
        assertThat(walletCaptor.getValue().getUserId()).isEqualTo(proposerId);
        assertThat(walletCaptor.getValue().getAmountCents()).isEqualTo(-amountCents);

        ArgumentCaptor<Bet> betCaptor = ArgumentCaptor.forClass(Bet.class);
        verify(betRepository).save(betCaptor.capture());
        Bet saved = betCaptor.getValue();
        assertThat(saved.getAmountCents()).isEqualTo(amountCents);
        assertThat(saved.getStatus()).isEqualTo("OPEN");
        assertThat(saved.getAcceptorStakeCents()).isZero();
    }

    @Test
    void accept_debits_acceptor_with_rounded_stake_and_sets_status() {
        UUID groupId = UUID.randomUUID();
        UUID betId = UUID.randomUUID();
        UUID proposerId = UUID.randomUUID();
        UUID acceptorId = UUID.randomUUID();

        Bet bet = new Bet();
        bet.setId(betId);
        bet.setGroupId(groupId);
        bet.setGameId(UUID.randomUUID());
        bet.setProposerId(proposerId);
        bet.setAmountCents(10_000);
        bet.setOdds(1.37); // stake should round to 3700 cents (10_000 * 0.37 = 3_700)
        bet.setStatus("OPEN");
        bet.setCutoffTime(Instant.now().plusSeconds(600));

        when(betRepository.findByIdForUpdate(betId)).thenReturn(Optional.of(bet));
        when(groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, acceptorId)).thenReturn(true);
        when(betRepository.save(any(Bet.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User acceptor = buildUser(acceptorId, "acceptor");
        authenticate(acceptor);

        BetResponse response = betService.accept(betId, new AcceptBetRequest());

        long expectedStake = 3_700;
        ArgumentCaptor<WalletDepositRequest> walletCaptor = ArgumentCaptor.forClass(WalletDepositRequest.class);
        verify(walletService).deposit(eq(groupId), walletCaptor.capture(), eq("BET_ACCEPT"));
        WalletDepositRequest debit = walletCaptor.getValue();
        assertThat(debit.getUserId()).isEqualTo(acceptorId);
        assertThat(debit.getAmountCents()).isEqualTo(-expectedStake);

        assertThat(response.status()).isEqualTo("ACCEPTED");
        assertThat(response.acceptorId()).isEqualTo(acceptorId);
        assertThat(response.acceptorStakeCents()).isEqualTo(expectedStake);

        assertThat(bet.getStatus()).isEqualTo("ACCEPTED");
        assertThat(bet.getAcceptorId()).isEqualTo(acceptorId);
        assertThat(bet.getAcceptorStakeCents()).isEqualTo(expectedStake);
    }

    @Test
    void accept_throws_if_proposer_attempts_to_accept_own_bet() {
        UUID betId = UUID.randomUUID();
        UUID proposerId = UUID.randomUUID();

        Bet bet = new Bet();
        bet.setId(betId);
        bet.setGroupId(UUID.randomUUID());
        bet.setProposerId(proposerId);
        bet.setAmountCents(500);
        bet.setOdds(1.5);
        bet.setStatus("OPEN");

        when(betRepository.findByIdForUpdate(betId)).thenReturn(Optional.of(bet));

        User proposer = buildUser(proposerId, "same-user");
        authenticate(proposer);

        assertThatThrownBy(() -> betService.accept(betId, new AcceptBetRequest()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Proposer cannot accept own bet");

        verify(walletService, never()).deposit(any(), any(), any());
        assertThat(bet.getStatus()).isEqualTo("OPEN");
    }

    private void authenticate(User user) {
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(user.getUsername(), "pw");
        SecurityContextHolder.getContext().setAuthentication(auth);
        when(userRepository.findByUsername(user.getUsername())).thenReturn(Optional.of(user));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
    }

    private static User buildUser(UUID id, String username) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setPasswordHash("hashed");
        return user;
    }
}
