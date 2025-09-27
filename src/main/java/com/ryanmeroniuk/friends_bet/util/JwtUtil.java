package com.ryanmeroniuk.friends_bet.util;

import com.ryanmeroniuk.friends_bet.model.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Component
public class JwtUtil {

    private final Key key;
    private final String issuer;
    private final String audience;

    public JwtUtil(
            @Value("${jwt.secret}") String base64Secret,
            @Value("${jwt.issuer:friends-bet}") String issuer,
            @Value("${jwt.audience:friends-bet-client}") String audience
    ) {
        byte[] secretBytes = Decoders.BASE64.decode(base64Secret);
        this.key = Keys.hmacShaKeyFor(secretBytes);
        this.issuer = issuer;
        this.audience = audience;
    }

    public TokenDetails generateAccessToken(User user, long ttlMs) {
        return buildToken(user, ttlMs, TokenType.ACCESS);
    }

    public TokenDetails generateRefreshToken(User user, long ttlMs) {
        return buildToken(user, ttlMs, TokenType.REFRESH);
    }

    public Claims parseAndValidate(String token) {
        Jws<Claims> claims = Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token);
        return claims.getBody();
    }

    private TokenDetails buildToken(User user, long ttlMs, TokenType type) {
        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plusMillis(ttlMs);
        String jti = UUID.randomUUID().toString();

        Map<String, Object> claims = new HashMap<>();
        claims.put("uid", Optional.ofNullable(user.getId()).map(UUID::toString).orElse(null));
        claims.put("token_type", type.name().toLowerCase(Locale.ROOT));
        if (type == TokenType.ACCESS) {
            claims.put("roles", Collections.singletonList("USER"));
        }

        String token = Jwts.builder()
                .setClaims(claims)
                .setSubject(user.getUsername())
                .setIssuer(issuer)
                .setAudience(audience)
                .setId(jti)
                .setIssuedAt(Date.from(issuedAt))
                .setExpiration(Date.from(expiresAt))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();

        return new TokenDetails(token, jti, issuedAt, expiresAt, type);
    }

    public record TokenDetails(String token,
                               String jti,
                               Instant issuedAt,
                               Instant expiresAt,
                               TokenType tokenType) {
        public Duration ttl() {
            return Duration.between(issuedAt, expiresAt);
        }
    }

    public enum TokenType {
        ACCESS,
        REFRESH
    }
}
