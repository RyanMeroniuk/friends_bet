package com.ryanmeroniuk.friends_bet.dto;

import java.util.UUID;

public class JoinGroupRequest {
    private UUID userId;

    public JoinGroupRequest() {}
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
}
