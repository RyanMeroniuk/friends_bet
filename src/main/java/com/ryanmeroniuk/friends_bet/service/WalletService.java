package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.dto.WalletDepositRequest;
import com.ryanmeroniuk.friends_bet.dto.WalletResponse;
import com.ryanmeroniuk.friends_bet.model.Group;
import com.ryanmeroniuk.friends_bet.model.User;
import com.ryanmeroniuk.friends_bet.model.Wallet;
import com.ryanmeroniuk.friends_bet.repository.GroupRepository;
import com.ryanmeroniuk.friends_bet.repository.UserRepository;
import com.ryanmeroniuk.friends_bet.repository.WalletRepository;
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

    public WalletService(WalletRepository walletRepo,
                         GroupRepository groupRepo,
                         UserRepository userRepo) {
        this.walletRepo = walletRepo;
        this.groupRepo = groupRepo;
        this.userRepo = userRepo;
    }

    /**
     * Deposit amount into a user's wallet for a given group.
     */
    @Transactional
    public WalletResponse deposit(UUID groupId, WalletDepositRequest req) {
        Group group = groupRepo.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));

        User user = userRepo.findById(req.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Use pessimistic locking to prevent race conditions on concurrent deposits/withdrawals
        Wallet w = walletRepo.findByGroupAndUserForUpdate(group, user)
                .orElseGet(() -> walletRepo.save(new Wallet(group, user)));

        long newBalance = w.getBalanceCents() + req.getAmountCents();
        if (newBalance < 0) {
            throw new IllegalArgumentException("Insufficient funds");
        }
        w.setBalanceCents(newBalance);
        Wallet saved = walletRepo.save(w);

        return new WalletResponse(saved.getUser().getId(), saved.getBalanceCents());
    }

    /**
     * List all wallets (balances) within a group.
     */
    public List<WalletResponse> listBalances(UUID groupId) {
        Group group = groupRepo.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));

        return walletRepo.findAllByGroup(group).stream()
                .map(w -> new WalletResponse(
                        w.getUser().getId(),
                        w.getBalanceCents()))
                .collect(Collectors.toList());
    }
}
