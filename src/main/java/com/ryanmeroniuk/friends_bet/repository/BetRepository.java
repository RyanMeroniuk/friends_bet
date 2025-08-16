package com.ryanmeroniuk.friends_bet.repository;

import com.ryanmeroniuk.friends_bet.model.Bet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BetRepository extends JpaRepository<Bet, UUID> {
    List<Bet> findAllByGroupId(UUID groupId);
    List<Bet> findAllByStatus(String status);
    List<Bet> findAllByGroupIdAndStatus(UUID groupId, String status);
}
