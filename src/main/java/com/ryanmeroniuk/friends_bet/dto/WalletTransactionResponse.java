package com.ryanmeroniuk.friends_bet.dto;

import java.time.Instant;
import java.util.UUID;

public record WalletTransactionResponse(
        UUID id,
        long amountCents,
        long balanceBefore,
        long balanceAfter,
        String transactionType,
        String referenceType,
        UUID referenceId,
        Instant createdAt
) {}
