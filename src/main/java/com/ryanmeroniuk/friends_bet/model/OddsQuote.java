package com.ryanmeroniuk.friends_bet.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "odds_quotes")
public class OddsQuote {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "game_id", nullable = false)
    private UUID gameId;

    @Column(name = "market_type", nullable = false, length = 32)
    private String marketType; // WINNER | SPREAD | TOTALS

    @Column(name = "home_price")
    private Double homePrice;  // decimal odds

    @Column(name = "away_price")
    private Double awayPrice;

    @Column(name = "line")
    private Double line;       // spread/totals line

    @Column(name = "source", nullable = false, length = 40)
    private String source;

    @Column(name = "captured_at", nullable = false)
    private Instant capturedAt = Instant.now();

    // getters/setters
    public UUID getId() { return id; }
    public UUID getGameId() { return gameId; }
    public void setGameId(UUID gameId) { this.gameId = gameId; }

    public String getMarketType() { return marketType; }
    public void setMarketType(String marketType) { this.marketType = marketType; }

    public Double getHomePrice() { return homePrice; }
    public void setHomePrice(Double homePrice) { this.homePrice = homePrice; }

    public Double getAwayPrice() { return awayPrice; }
    public void setAwayPrice(Double awayPrice) { this.awayPrice = awayPrice; }

    public Double getLine() { return line; }
    public void setLine(Double line) { this.line = line; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public Instant getCapturedAt() { return capturedAt; }
    public void setCapturedAt(Instant capturedAt) { this.capturedAt = capturedAt; }
}
