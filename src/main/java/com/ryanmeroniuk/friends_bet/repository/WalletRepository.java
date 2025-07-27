package com.ryanmeroniuk.friends_bet.repository;

import com.ryanmeroniuk.friends_bet.model.Wallet;
import com.ryanmeroniuk.friends_bet.model.Group;
import com.ryanmeroniuk.friends_bet.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface WalletRepository extends JpaRepository<Wallet, UUID> {
    Optional<Wallet> findByGroupAndUser(Group group, User user);
    List<Wallet> findAllByGroup(Group group);
}
