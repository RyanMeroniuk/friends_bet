package com.ryanmeroniuk.friends_bet.repository;

import com.ryanmeroniuk.friends_bet.model.Bet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BetRepository extends JpaRepository<Bet, UUID> {
    List<Bet> findAllByGroupId(UUID groupId);
    List<Bet> findAllByStatus(String status);
    List<Bet> findAllByGroupIdAndStatus(UUID groupId, String status);
    List<Bet> findByGameId(UUID gameId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Bet b WHERE b.id = :id")
    Optional<Bet> findByIdForUpdate(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Bet b WHERE b.gameId = :gameId")
    List<Bet> findByGameIdForUpdate(@Param("gameId") UUID gameId);
}
