package com.ryanmeroniuk.friends_bet.support;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

import java.security.Key;
import java.time.Instant;
import java.util.*;

/**
 * Generates valid JWT access tokens for {@code @WebMvcTest} controller tests.
 * Uses the same secret configured in application-test.properties.
 */
public final class TestJwtHelper {

    // Must match jwt.secret in application-test.properties
    private static final String BASE64_SECRET =
            "dGVzdC10ZXN0LXRlc3QtdGVzdC10ZXN0LXRlc3QtdGVzdC10ZXN0LXRlc3Q=";
    private static final Key KEY = Keys.hmacShaKeyFor(Decoders.BASE64.decode(BASE64_SECRET));

    private TestJwtHelper() {}

    public static String generateAccessToken(String username, UUID userId) {
        Instant now = Instant.now();
        Map<String, Object> claims = new HashMap<>();
        claims.put("uid", userId.toString());
        claims.put("token_type", "access");
        claims.put("roles", Collections.singletonList("USER"));

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(username)
                .setIssuer("friends-bet")
                .setAudience("friends-bet-client")
                .setId(UUID.randomUUID().toString())
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusSeconds(900)))
                .signWith(KEY, SignatureAlgorithm.HS256)
                .compact();
    }

    public static String generateRefreshToken(String username, UUID userId, String jti) {
        Instant now = Instant.now();
        Map<String, Object> claims = new HashMap<>();
        claims.put("uid", userId.toString());
        claims.put("token_type", "refresh");

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(username)
                .setIssuer("friends-bet")
                .setAudience("friends-bet-client")
                .setId(jti)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusSeconds(86400)))
                .signWith(KEY, SignatureAlgorithm.HS256)
                .compact();
    }

    public static String bearerHeader(String username, UUID userId) {
        return "Bearer " + generateAccessToken(username, userId);
    }
}
