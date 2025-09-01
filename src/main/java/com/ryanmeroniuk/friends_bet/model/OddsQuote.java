package com.ryanmeroniuk.friends_bet.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "odds_quotes")
public class OddsQuote {

    @Id
    @Column(nullable = false)
    private UUID id;

    @Column(name = "game_id", nullable = false)
    private UUID gameId;

    @Column(name = "market_type", nullable = false)
    private String marketType; // e.g. WINNER, SPREAD, TOTALS, etc.

    @Column(name = "pick", nullable = false)
    private String pick;       // HOME / AWAY / OVER / UNDER

    @Column(name = "odds", nullable = false)
    private double odds;       // decimal odds; DB check (odds > 1.0)

    // DB has default now(); let Postgres fill it
    @Column(name = "quoted_at", nullable = false, insertable = false, updatable = false)
    private Instant quotedAt;

    @Column(name = "provider")
    private String provider;   // nullable

    @Column(name = "source")
    private String source;     // nullable (DB default 'external' if omitted)

    @Column(name = "cutoff_time")
    private Instant cutoffTime; // nullable

    // JSONB details (DB default '{}'::jsonb)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "details", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> details = Map.of();

    /* --- lifecycle --- */
    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID(); // table has no default; generate in app
        if (details == null) details = Map.of();
    }

    /* --- getters/setters --- */
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getGameId() { return gameId; }
    public void setGameId(UUID gameId) { this.gameId = gameId; }

    public String getMarketType() { return marketType; }
    public void setMarketType(String marketType) { this.marketType = marketType; }

    public String getPick() { return pick; }
    public void setPick(String pick) { this.pick = pick; }

    public double getOdds() { return odds; }
    public void setOdds(double odds) { this.odds = odds; }

    public Instant getQuotedAt() { return quotedAt; }
    public void setQuotedAt(Instant quotedAt) { this.quotedAt = quotedAt; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public Instant getCutoffTime() { return cutoffTime; }
    public void setCutoffTime(Instant cutoffTime) { this.cutoffTime = cutoffTime; }

    public Map<String, Object> getDetails() { return details; }
    public void setDetails(Map<String, Object> details) { this.details = details; }
}
