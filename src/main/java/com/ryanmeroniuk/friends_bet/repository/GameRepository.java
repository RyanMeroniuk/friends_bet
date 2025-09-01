package com.ryanmeroniuk.friends_bet.repository;

import com.ryanmeroniuk.friends_bet.model.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GameRepository extends JpaRepository<Game, UUID> {

    Optional<Game> findByExternalGameId(String externalGameId);

    List<Game> findByStartTimeBetweenOrderByStartTimeAsc(Instant startInclusive,
                                                         Instant endInclusive);
    List<Game> findBySportAndStartTimeBetweenOrderByStartTimeAsc(String sport,
                                                                 Instant startInclusive,
                                                                 Instant endInclusive);
    @Query("select distinct g.sport from Game g where g.sport is not null order by g.sport")
    List<String> findDistinctSports();
    @Query("""
           select distinct g.sport
           from Game g
           where g.sport is not null
             and g.startTime between :start and :end
           order by g.sport
           """)
    List<String> findDistinctSportsWithGamesBetween(@Param("start") Instant start,
                                                    @Param("end") Instant end);
}
