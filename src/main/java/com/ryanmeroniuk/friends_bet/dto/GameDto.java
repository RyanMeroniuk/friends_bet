package com.ryanmeroniuk.friends_bet.dto;

import java.time.Instant;
import java.util.UUID;

public record GameDto(
        UUID id,
        String sport,
        Instant startTime,
        String homeTeam,
        String awayTeam
) {}
