package com.ryanmeroniuk.friends_bet.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "bets")
public class Bet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "group_id", nullable = false)
    private UUID groupId;

    @Column(name = "game_id", nullable = false)
    private UUID gameId;

    @Column(name = "proposer_id", nullable = false)
    private UUID proposerId;

    @Column(name = "acceptor_id")
    private UUID acceptorId;

    @Column(name = "market_type", nullable = false, length = 255)
    private String marketType; // e.g. WINNER, SPREAD, TOTALS, PLAYER_PROP, etc.

    @Column(name = "pick", nullable = false)
    private String pick;       // e.g. "home", "away", "over", "under", or team/player key

    @Column(name = "amount_cents", nullable = false)
    private long amountCents;

    @Column(name = "odds", nullable = false)
    private double odds;

    @Column(name = "status", nullable = false)
    private String status;     // e.g. OPEN, ACCEPTED, SETTLED_WON, SETTLED_LOST, CANCELLED

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    // Flexible per-market payload (JSONB)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "details", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> details = new HashMap<>();

    // Quoted odds metadata (optional)
    @Column(name = "quoted_at")
    private Instant quotedAt;

    @Column(name = "source", length = 40)
    private String source;     // e.g. "DK", "FD", "MGM", or "internal"

    // When the bet can no longer be accepted/edited
    @Column(name = "cutoff_time")
    private Instant cutoffTime;

    public Bet() {
        // JPA
    }

    // --- lifecycle ---
    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (status == null) status = "OPEN";
        if (details == null) details = new HashMap<>();
    }

    // --- getters/setters ---

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getGroupId() {
        return groupId;
    }

    public void setGroupId(UUID groupId) {
        this.groupId = groupId;
    }

    public UUID getGameId() {
        return gameId;
    }

    public void setGameId(UUID gameId) {
        this.gameId = gameId;
    }

    public UUID getProposerId() {
        return proposerId;
    }

    public void setProposerId(UUID proposerId) {
        this.proposerId = proposerId;
    }

    public UUID getAcceptorId() {
        return acceptorId;
    }

    public void setAcceptorId(UUID acceptorId) {
        this.acceptorId = acceptorId;
    }

    public String getMarketType() {
        return marketType;
    }

    public void setMarketType(String marketType) {
        this.marketType = marketType;
    }

    public String getPick() {
        return pick;
    }

    public void setPick(String pick) {
        this.pick = pick;
    }

    public long getAmountCents() {
        return amountCents;
    }

    public void setAmountCents(long amountCents) {
        this.amountCents = amountCents;
    }

    public double getOdds() {
        return odds;
    }

    public void setOdds(double odds) {
        this.odds = odds;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(Instant resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public Map<String, Object> getDetails() {
        return details;
    }

    public void setDetails(Map<String, Object> details) {
        this.details = details;
    }

    public Instant getQuotedAt() {
        return quotedAt;
    }

    public void setQuotedAt(Instant quotedAt) {
        this.quotedAt = quotedAt;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public Instant getCutoffTime() {
        return cutoffTime;
    }

    public void setCutoffTime(Instant cutoffTime) {
        this.cutoffTime = cutoffTime;
    }

    @Override
    public String toString() {
        return "Bet{" +
                "id=" + id +
                ", groupId=" + groupId +
                ", gameId=" + gameId +
                ", proposerId=" + proposerId +
                ", acceptorId=" + acceptorId +
                ", marketType='" + marketType + '\'' +
                ", pick='" + pick + '\'' +
                ", amountCents=" + amountCents +
                ", odds=" + odds +
                ", status='" + status + '\'' +
                ", createdAt=" + createdAt +
                ", resolvedAt=" + resolvedAt +
                ", quotedAt=" + quotedAt +
                ", source='" + source + '\'' +
                ", cutoffTime=" + cutoffTime +
                '}';
    }
}
