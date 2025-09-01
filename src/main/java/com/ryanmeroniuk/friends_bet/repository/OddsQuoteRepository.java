package com.ryanmeroniuk.friends_bet.repository;

import com.ryanmeroniuk.friends_bet.model.OddsQuote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface OddsQuoteRepository extends JpaRepository<OddsQuote, UUID> {

    // controller uses these names (note: property is 'quotedAt' on the entity)
    List<OddsQuote> findTop200ByGameIdOrderByQuotedAtDesc(UUID gameId);

    List<OddsQuote> findTop10ByGameIdAndMarketTypeOrderByQuotedAtDesc(UUID gameId, String marketType);

    // controller: list available market types for a game
    @Query("select distinct q.marketType from OddsQuote q where q.gameId = :gameId order by q.marketType")
    List<String> findDistinctMarketTypesByGameId(@Param("gameId") UUID gameId);
}
