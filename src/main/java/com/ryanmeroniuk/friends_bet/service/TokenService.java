package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.model.RefreshToken;
import com.ryanmeroniuk.friends_bet.model.User;
import com.ryanmeroniuk.friends_bet.repository.RefreshTokenRepository;
import com.ryanmeroniuk.friends_bet.util.JwtUtil;
import io.jsonwebtoken.Claims;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Service
public class TokenService {

    private static final Duration ACCESS_TOKEN_TTL = Duration.ofMinutes(15);
    private static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(14);

    private final JwtUtil jwtUtil;
    private final RefreshTokenRepository refreshTokenRepository;

    public TokenService(JwtUtil jwtUtil, RefreshTokenRepository refreshTokenRepository) {
        this.jwtUtil = jwtUtil;
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @Transactional
    public TokenPair issueTokenPair(User user) {
        refreshTokenRepository.revokeActiveTokensForUser(user.getId(), Instant.now());

        JwtUtil.TokenDetails access = jwtUtil.generateAccessToken(user, ACCESS_TOKEN_TTL.toMillis());
        JwtUtil.TokenDetails refresh = jwtUtil.generateRefreshToken(user, REFRESH_TOKEN_TTL.toMillis());

        refreshTokenRepository.save(new RefreshToken(refresh.jti(), user, refresh.expiresAt()));
        return new TokenPair(access.token(), refresh.token());
    }

    @Transactional
    public TokenPair rotateRefreshToken(String oldJti, Claims claims) {
        RefreshToken existing = refreshTokenRepository.findById(oldJti)
                .orElseThrow(() -> new IllegalArgumentException("Refresh token not recognized"));

        assertRefreshMatchesClaims(existing, claims);

        if (existing.isRevoked() || existing.isExpired()) {
            throw new IllegalArgumentException("Refresh token expired or revoked");
        }

        existing.revoke();
        refreshTokenRepository.save(existing);

        User user = existing.getUser();
        JwtUtil.TokenDetails access = jwtUtil.generateAccessToken(user, ACCESS_TOKEN_TTL.toMillis());
        JwtUtil.TokenDetails refresh = jwtUtil.generateRefreshToken(user, REFRESH_TOKEN_TTL.toMillis());
        refreshTokenRepository.save(new RefreshToken(refresh.jti(), user, refresh.expiresAt()));

        return new TokenPair(access.token(), refresh.token());
    }

    @Transactional
    public void revokeRefreshToken(String jti) {
        refreshTokenRepository.findById(jti).ifPresent(token -> {
            if (!token.isRevoked()) {
                token.revoke();
                refreshTokenRepository.save(token);
            }
        });
    }

    private void assertRefreshMatchesClaims(RefreshToken token, Claims claims) {
        String claimUid = claims.get("uid", String.class);
        if (claimUid == null) {
            throw new IllegalArgumentException("Refresh token missing uid claim");
        }

        UUID userId = token.getUserId();
        if (!Objects.equals(userId.toString(), claimUid)) {
            throw new IllegalArgumentException("Refresh token subject mismatch");
        }

        String subject = claims.getSubject();
        if (subject == null || !Objects.equals(subject, token.getUser().getUsername())) {
            throw new IllegalArgumentException("Refresh token subject mismatch");
        }
    }

    public Duration getRefreshTokenTtl() {
        return REFRESH_TOKEN_TTL;
    }

    public record TokenPair(String accessToken, String refreshToken) {}
}
