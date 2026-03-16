package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.dto.WalletDepositRequest;
import com.ryanmeroniuk.friends_bet.dto.WalletResponse;
import com.ryanmeroniuk.friends_bet.model.Group;
import com.ryanmeroniuk.friends_bet.model.User;
import com.ryanmeroniuk.friends_bet.model.Wallet;
import com.ryanmeroniuk.friends_bet.model.WalletTransaction;
import com.ryanmeroniuk.friends_bet.repository.GroupMemberRepository;
import com.ryanmeroniuk.friends_bet.repository.GroupRepository;
import com.ryanmeroniuk.friends_bet.repository.UserRepository;
import com.ryanmeroniuk.friends_bet.repository.WalletRepository;
import com.ryanmeroniuk.friends_bet.repository.WalletTransactionRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class WalletService {
    private final WalletRepository walletRepo;
    private final GroupRepository groupRepo;
    private final UserRepository userRepo;
    private final GroupMemberRepository groupMemberRepo;
    private final WalletTransactionRepository txnRepo;

    public WalletService(WalletRepository walletRepo,
                         GroupRepository groupRepo,
                         UserRepository userRepo,
                         GroupMemberRepository groupMemberRepo,
                         WalletTransactionRepository txnRepo) {
        this.walletRepo = walletRepo;
        this.groupRepo = groupRepo;
        this.userRepo = userRepo;
        this.groupMemberRepo = groupMemberRepo;
        this.txnRepo = txnRepo;
    }

    /**
     * Deposit amount into a user's wallet for a given group.
     * @param reason transaction type for audit: DEPOSIT, WITHDRAWAL, BET_PROPOSE, BET_ACCEPT, BET_WIN, BET_REFUND
     */
    @Transactional
    public WalletResponse deposit(UUID groupId, WalletDepositRequest req, String reason) {
        Group group = groupRepo.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));

        User user = userRepo.findById(req.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Use pessimistic locking to prevent race conditions on concurrent deposits/withdrawals
        Wallet w = walletRepo.findByGroupAndUserForUpdate(group, user)
                .orElseGet(() -> walletRepo.save(new Wallet(group, user)));

        long balanceBefore = w.getBalanceCents();
        long newBalance = balanceBefore + req.getAmountCents();
        if (newBalance < 0) {
            throw new IllegalArgumentException("Insufficient funds");
        }
        w.setBalanceCents(newBalance);
        Wallet saved = walletRepo.save(w);

        txnRepo.save(new WalletTransaction(saved, req.getAmountCents(), balanceBefore, newBalance, reason));

        return new WalletResponse(saved.getUser().getId(), saved.getBalanceCents());
    }

    /** Convenience overload — defaults reason to DEPOSIT or WITHDRAWAL based on sign. */
    @Transactional
    public WalletResponse deposit(UUID groupId, WalletDepositRequest req) {
        String reason = req.getAmountCents() >= 0 ? "DEPOSIT" : "WITHDRAWAL";
        return deposit(groupId, req, reason);
    }

    /**
     * List all wallets (balances) within a group.
     */
    public List<WalletResponse> listBalances(UUID groupId) {
        Group group = groupRepo.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));

        UUID actor = currentUserId();
        if (!groupMemberRepo.existsByGroup_IdAndUser_Id(groupId, actor)) {
            throw new IllegalArgumentException("Not a member of this group");
        }

        return walletRepo.findAllByGroup(group).stream()
                .map(w -> new WalletResponse(
                        w.getUser().getId(),
                        w.getBalanceCents()))
                .collect(Collectors.toList());
    }

    private UUID currentUserId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByUsername(username)
                .map(u -> u.getId())
                .orElseThrow(() -> new IllegalArgumentException("Auth user not found"));
    }
}
