package com.ryanmeroniuk.friends_bet.dto;

import java.util.UUID;

public class WalletDepositRequest {
    private UUID userId;
    private long amountCents;

    public WalletDepositRequest() {}

    public WalletDepositRequest(UUID userId, long amountCents) {
        this.userId = userId;
        this.amountCents = amountCents;
    }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public long getAmountCents() { return amountCents; }
    public void setAmountCents(long amountCents) { this.amountCents = amountCents; }
}
