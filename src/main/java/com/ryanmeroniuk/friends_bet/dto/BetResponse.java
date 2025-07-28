package com.ryanmeroniuk.friends_bet.dto;

import java.time.Instant;
import java.util.UUID;

public class BetResponse {
    private final UUID id;
    private final UUID groupId;
    private final UUID proposerId;
    private final UUID acceptorId;    // null if not yet accepted
    private final String gameId;
    private final String marketType;
    private final String pick;
    private final long amountCents;
    private final double odds;
    private final String status;
    private final Instant createdAt;
    private final Instant resolvedAt;

    public BetResponse(
            UUID id, UUID groupId, UUID proposerId, UUID acceptorId,
            String gameId, String marketType, String pick,
            long amountCents, double odds,
            String status, Instant createdAt, Instant resolvedAt
    ) {
        this.id = id;
        this.groupId = groupId;
        this.proposerId = proposerId;
        this.acceptorId = acceptorId;
        this.gameId = gameId;
        this.marketType = marketType;
        this.pick = pick;
        this.amountCents = amountCents;
        this.odds = odds;
        this.status = status;
        this.createdAt = createdAt;
        this.resolvedAt = resolvedAt;
    }

    public UUID getId() { return id; }
    public UUID getGroupId() { return groupId; }
    public UUID getProposerId() { return proposerId; }
    public UUID getAcceptorId() { return acceptorId; }
    public String getGameId() { return gameId; }
    public String getMarketType() { return marketType; }
    public String getPick() { return pick; }
    public long getAmountCents() { return amountCents; }
    public double getOdds() { return odds; }
    public String getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getResolvedAt() { return resolvedAt; }
}
