package com.ryanmeroniuk.friends_bet.service;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory deny-list for revoked access tokens.
 * Entries auto-expire after the access token TTL (15 minutes).
 */
@Service
public class TokenDenyListService {

    private static final Duration ACCESS_TOKEN_TTL = Duration.ofMinutes(15);
    private final ConcurrentHashMap<String, Instant> denied = new ConcurrentHashMap<>();

    /** Deny an access token by its JTI. */
    public void deny(String jti) {
        if (jti != null && !jti.isBlank()) {
            evictExpired();
            denied.put(jti, Instant.now());
        }
    }

    /** Check if a JTI has been denied. */
    public boolean isDenied(String jti) {
        if (jti == null) return false;
        Instant deniedAt = denied.get(jti);
        if (deniedAt == null) return false;
        if (deniedAt.plus(ACCESS_TOKEN_TTL).isBefore(Instant.now())) {
            denied.remove(jti);
            return false;
        }
        return true;
    }

    private void evictExpired() {
        Instant cutoff = Instant.now().minus(ACCESS_TOKEN_TTL);
        denied.entrySet().removeIf(e -> e.getValue().isBefore(cutoff));
    }
}
