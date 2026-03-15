package com.ryanmeroniuk.friends_bet.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class WalletDepositRequest {

    @NotNull(message = "User ID is required")
    private UUID userId;

    // Note: amountCents can be negative (withdrawal) or positive (deposit)
    // Business logic validates sufficient funds, not the DTO
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
