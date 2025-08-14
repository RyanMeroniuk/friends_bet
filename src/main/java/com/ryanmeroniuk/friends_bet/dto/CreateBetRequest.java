package com.ryanmeroniuk.friends_bet.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public class CreateBetRequest {
    private UUID groupId;
    private UUID proposerId;
    private UUID gameId;
    private String marketType;
    private String pick;
    private long amountCents;
    private double odds;
    private Map<String, Object> details;
    private Instant cutoffTime;

    public CreateBetRequest() {}

    public UUID getGroupId() { return groupId; }
    public void setGroupId(UUID groupId) { this.groupId = groupId; }

    public UUID getProposerId() { return proposerId; }
    public void setProposerId(UUID proposerId) { this.proposerId = proposerId; }

    public UUID getGameId() { return gameId; }
    public void setGameId(UUID gameId) { this.gameId = gameId; }

    public String getMarketType() { return marketType; }
    public void setMarketType(String marketType) { this.marketType = marketType; }

    public String getPick() { return pick; }
    public void setPick(String pick) { this.pick = pick; }

    public long getAmountCents() { return amountCents; }
    public void setAmountCents(long amountCents) { this.amountCents = amountCents; }

    public double getOdds() { return odds; }
    public void setOdds(double odds) { this.odds = odds; }

    public Map<String, Object> getDetails() { return details; }
    public void setDetails(Map<String, Object> details) { this.details = details; }

    public Instant getCutoffTime() { return cutoffTime; }
    public void setCutoffTime(Instant cutoffTime) { this.cutoffTime = cutoffTime; }
}
