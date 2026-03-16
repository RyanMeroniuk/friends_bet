package com.ryanmeroniuk.friends_bet.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public class CreateBetRequest {

    @NotNull(message = "Group ID is required")
    private UUID groupId;

    private UUID proposerId; // Set from authenticated user, not required in request

    @NotNull(message = "Game ID is required")
    private UUID gameId;

    @NotBlank(message = "Market type is required")
    private String marketType;

    @NotBlank(message = "Pick is required")
    private String pick;

    @Min(value = 1, message = "Bet amount must be at least 1 cent")
    private long amountCents;

    @DecimalMin(value = "1.0", inclusive = false, message = "Odds must be greater than 1.0")
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
