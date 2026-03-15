package com.ryanmeroniuk.friends_bet.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class JoinGroupRequest {

    @NotNull(message = "User ID is required")
    private UUID userId;

    public JoinGroupRequest() {}
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
}
