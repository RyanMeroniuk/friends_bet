package com.ryanmeroniuk.friends_bet.dto;

import java.util.UUID;

public class WalletDepositRequest {
    private UUID userId;
    private long amountCents;

    public WalletDepositRequest() {}
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public long getAmountCents() { return amountCents; }
    public void setAmountCents(long amountCents) { this.amountCents = amountCents; }
}
