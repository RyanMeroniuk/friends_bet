package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.dto.WalletDepositRequest;
import com.ryanmeroniuk.friends_bet.dto.WalletResponse;
import com.ryanmeroniuk.friends_bet.model.Group;
import com.ryanmeroniuk.friends_bet.model.User;
import com.ryanmeroniuk.friends_bet.model.Wallet;
import com.ryanmeroniuk.friends_bet.repository.GroupMemberRepository;
import com.ryanmeroniuk.friends_bet.repository.GroupRepository;
import com.ryanmeroniuk.friends_bet.repository.UserRepository;
import com.ryanmeroniuk.friends_bet.repository.WalletRepository;
import com.ryanmeroniuk.friends_bet.repository.WalletTransactionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WalletServiceTest {

    @Mock
    private WalletRepository walletRepo;

    @Mock
    private GroupRepository groupRepo;

    @Mock
    private UserRepository userRepo;

    @Mock
    private GroupMemberRepository groupMemberRepo;

    @Mock
    private WalletTransactionRepository txnRepo;

    @InjectMocks
    private WalletService walletService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void deposit_createsNewWallet_whenNoneExists() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Group group = buildGroup(groupId);
        User user = buildUser(userId);

        when(groupRepo.findById(groupId)).thenReturn(Optional.of(group));
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));
        when(walletRepo.findByGroupAndUserForUpdate(group, user)).thenReturn(Optional.empty());

        when(walletRepo.save(any(Wallet.class))).thenAnswer(inv -> inv.getArgument(0));

        WalletDepositRequest req = new WalletDepositRequest(userId, 5_000L);
        WalletResponse response = walletService.deposit(groupId, req);

        assertThat(response.getBalanceCents()).isEqualTo(5_000L);
        assertThat(response.getUserId()).isEqualTo(userId);
    }

    @Test
    void deposit_addsToExistingBalance() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Group group = buildGroup(groupId);
        User user = buildUser(userId);
        Wallet wallet = new Wallet(group, user);
        wallet.setBalanceCents(5_000L);

        when(groupRepo.findById(groupId)).thenReturn(Optional.of(group));
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));
        when(walletRepo.findByGroupAndUserForUpdate(group, user)).thenReturn(Optional.of(wallet));
        when(walletRepo.save(any(Wallet.class))).thenAnswer(inv -> inv.getArgument(0));

        WalletDepositRequest req = new WalletDepositRequest(userId, 3_000L);
        WalletResponse response = walletService.deposit(groupId, req);

        assertThat(response.getBalanceCents()).isEqualTo(8_000L);
    }

    @Test
    void deposit_withdrawal_success() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Group group = buildGroup(groupId);
        User user = buildUser(userId);
        Wallet wallet = new Wallet(group, user);
        wallet.setBalanceCents(5_000L);

        when(groupRepo.findById(groupId)).thenReturn(Optional.of(group));
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));
        when(walletRepo.findByGroupAndUserForUpdate(group, user)).thenReturn(Optional.of(wallet));
        when(walletRepo.save(any(Wallet.class))).thenAnswer(inv -> inv.getArgument(0));

        WalletDepositRequest req = new WalletDepositRequest(userId, -3_000L);
        WalletResponse response = walletService.deposit(groupId, req);

        assertThat(response.getBalanceCents()).isEqualTo(2_000L);
    }

    @Test
    void deposit_insufficientFunds_throws() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Group group = buildGroup(groupId);
        User user = buildUser(userId);
        Wallet wallet = new Wallet(group, user);
        wallet.setBalanceCents(1_000L);

        when(groupRepo.findById(groupId)).thenReturn(Optional.of(group));
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));
        when(walletRepo.findByGroupAndUserForUpdate(group, user)).thenReturn(Optional.of(wallet));

        WalletDepositRequest req = new WalletDepositRequest(userId, -2_000L);

        assertThatThrownBy(() -> walletService.deposit(groupId, req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Insufficient funds");
    }

    @Test
    void deposit_groupNotFound_throws() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        when(groupRepo.findById(groupId)).thenReturn(Optional.empty());

        WalletDepositRequest req = new WalletDepositRequest(userId, 1_000L);

        assertThatThrownBy(() -> walletService.deposit(groupId, req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Group not found");
    }

    @Test
    void deposit_userNotFound_throws() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Group group = buildGroup(groupId);

        when(groupRepo.findById(groupId)).thenReturn(Optional.of(group));
        when(userRepo.findById(userId)).thenReturn(Optional.empty());

        WalletDepositRequest req = new WalletDepositRequest(userId, 1_000L);

        assertThatThrownBy(() -> walletService.deposit(groupId, req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("User not found");
    }

    @Test
    void listBalances_returnsAllWallets() {
        UUID groupId = UUID.randomUUID();
        Group group = buildGroup(groupId);
        User actor = buildUser(UUID.randomUUID());
        User user2 = buildUser(UUID.randomUUID());

        // Set up auth context
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(actor.getUsername(), null, List.of()));
        when(userRepo.findByUsername(actor.getUsername())).thenReturn(Optional.of(actor));
        when(groupMemberRepo.existsByGroup_IdAndUser_Id(groupId, actor.getId())).thenReturn(true);

        Wallet w1 = new Wallet(group, actor);
        w1.setBalanceCents(3_000L);
        Wallet w2 = new Wallet(group, user2);
        w2.setBalanceCents(7_000L);

        when(groupRepo.findById(groupId)).thenReturn(Optional.of(group));
        when(walletRepo.findAllByGroup(group)).thenReturn(List.of(w1, w2));

        List<WalletResponse> balances = walletService.listBalances(groupId);

        assertThat(balances).hasSize(2);
        assertThat(balances).extracting(WalletResponse::getBalanceCents)
                .containsExactlyInAnyOrder(3_000L, 7_000L);
    }

    @Test
    void listBalances_groupNotFound_throws() {
        UUID groupId = UUID.randomUUID();
        when(groupRepo.findById(groupId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> walletService.listBalances(groupId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Group not found");
    }

    // --- helpers ---

    private static Group buildGroup(UUID id) {
        Group g = new Group("Test Group");
        // Group doesn't have setId, so we use reflection or just accept the generated one
        // For mock tests, the object identity matters more than the id field
        return g;
    }

    private static User buildUser(UUID id) {
        User u = new User("user-" + id.toString().substring(0, 8), id + "@test.com", "hashed");
        u.setId(id);
        return u;
    }
}
