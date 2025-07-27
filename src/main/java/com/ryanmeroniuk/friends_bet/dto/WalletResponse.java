package com.ryanmeroniuk.friends_bet.dto;

import java.util.UUID;

public class WalletResponse {
    private UUID userId;
    private long balanceCents;

    public WalletResponse(UUID userId, long balanceCents) {
        this.userId = userId;
        this.balanceCents = balanceCents;
    }

    public UUID getUserId() { return userId; }
    public long getBalanceCents() { return balanceCents; }
}
