package com.ryanmeroniuk.friends_bet.repository;

import com.ryanmeroniuk.friends_bet.model.OddsQuote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OddsQuoteRepository extends JpaRepository<OddsQuote, UUID> {
    List<OddsQuote> findTop10ByGameIdOrderByCapturedAtDesc(UUID gameId);
    List<OddsQuote> findTop10ByGameIdAndMarketTypeOrderByCapturedAtDesc(UUID gameId, String marketType);
}
