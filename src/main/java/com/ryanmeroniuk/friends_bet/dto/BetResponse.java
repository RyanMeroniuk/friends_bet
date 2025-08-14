package com.ryanmeroniuk.friends_bet.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record BetResponse(
        UUID id,
        UUID groupId,
        UUID gameId,
        UUID proposerId,
        UUID acceptorId,
        String marketType,
        String pick,
        long amountCents,
        long acceptorStakeCents,
        double odds,
        String status,
        Instant createdAt,
        Instant resolvedAt,
        Map<String, Object> details,
        Instant quotedAt,
        String source,
        Instant cutoffTime
) {}
