package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.model.RefreshToken;
import com.ryanmeroniuk.friends_bet.model.User;
import com.ryanmeroniuk.friends_bet.repository.RefreshTokenRepository;
import com.ryanmeroniuk.friends_bet.util.JwtUtil;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TokenServiceTest {

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @InjectMocks
    private TokenService tokenService;

    @Test
    void issueTokenPair_revokesOldTokens_andIssuesNew() {
        User user = buildUser();
        JwtUtil.TokenDetails accessDetails = new JwtUtil.TokenDetails(
                "access-token", "access-jti", Instant.now(), Instant.now().plusSeconds(900), JwtUtil.TokenType.ACCESS);
        JwtUtil.TokenDetails refreshDetails = new JwtUtil.TokenDetails(
                "refresh-token", "refresh-jti", Instant.now(), Instant.now().plusSeconds(86400), JwtUtil.TokenType.REFRESH);

        when(jwtUtil.generateAccessToken(eq(user), anyLong())).thenReturn(accessDetails);
        when(jwtUtil.generateRefreshToken(eq(user), anyLong())).thenReturn(refreshDetails);
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        TokenService.TokenPair pair = tokenService.issueTokenPair(user);

        assertThat(pair.accessToken()).isEqualTo("access-token");
        assertThat(pair.refreshToken()).isEqualTo("refresh-token");
        verify(refreshTokenRepository).revokeActiveTokensForUser(eq(user.getId()), any(Instant.class));
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void rotateRefreshToken_success() {
        User user = buildUser();
        String oldJti = "old-jti";
        RefreshToken existing = new RefreshToken(oldJti, user, Instant.now().plusSeconds(86400));

        Claims claims = mockClaims(user);

        when(refreshTokenRepository.findById(oldJti)).thenReturn(Optional.of(existing));

        JwtUtil.TokenDetails newAccess = new JwtUtil.TokenDetails(
                "new-access", "new-access-jti", Instant.now(), Instant.now().plusSeconds(900), JwtUtil.TokenType.ACCESS);
        JwtUtil.TokenDetails newRefresh = new JwtUtil.TokenDetails(
                "new-refresh", "new-refresh-jti", Instant.now(), Instant.now().plusSeconds(86400), JwtUtil.TokenType.REFRESH);

        when(jwtUtil.generateAccessToken(eq(user), anyLong())).thenReturn(newAccess);
        when(jwtUtil.generateRefreshToken(eq(user), anyLong())).thenReturn(newRefresh);
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        TokenService.TokenPair pair = tokenService.rotateRefreshToken(oldJti, claims);

        assertThat(pair.accessToken()).isEqualTo("new-access");
        assertThat(pair.refreshToken()).isEqualTo("new-refresh");
        assertThat(existing.isRevoked()).isTrue();
    }

    @Test
    void rotateRefreshToken_notFound_throws() {
        when(refreshTokenRepository.findById("missing-jti")).thenReturn(Optional.empty());
        Claims claims = mock(Claims.class);

        assertThatThrownBy(() -> tokenService.rotateRefreshToken("missing-jti", claims))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Refresh token not recognized");
    }

    @Test
    void rotateRefreshToken_alreadyRevoked_throws() {
        User user = buildUser();
        RefreshToken existing = new RefreshToken("old-jti", user, Instant.now().plusSeconds(86400));
        existing.revoke();

        Claims claims = mockClaims(user);

        when(refreshTokenRepository.findById("old-jti")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> tokenService.rotateRefreshToken("old-jti", claims))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("expired or revoked");
    }

    @Test
    void rotateRefreshToken_expired_throws() {
        User user = buildUser();
        // Expired 1 hour ago
        RefreshToken existing = new RefreshToken("old-jti", user, Instant.now().minusSeconds(3600));

        Claims claims = mockClaims(user);

        when(refreshTokenRepository.findById("old-jti")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> tokenService.rotateRefreshToken("old-jti", claims))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("expired or revoked");
    }

    @Test
    void rotateRefreshToken_subjectMismatch_throws() {
        User user = buildUser();
        RefreshToken existing = new RefreshToken("old-jti", user, Instant.now().plusSeconds(86400));

        // Claims with different uid
        Claims claims = mock(Claims.class);
        when(claims.get("uid", String.class)).thenReturn(UUID.randomUUID().toString());
        when(refreshTokenRepository.findById("old-jti")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> tokenService.rotateRefreshToken("old-jti", claims))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("subject mismatch");
    }

    @Test
    void revokeRefreshToken_success() {
        User user = buildUser();
        RefreshToken token = new RefreshToken("jti-to-revoke", user, Instant.now().plusSeconds(86400));

        when(refreshTokenRepository.findById("jti-to-revoke")).thenReturn(Optional.of(token));
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        tokenService.revokeRefreshToken("jti-to-revoke");

        assertThat(token.isRevoked()).isTrue();
        verify(refreshTokenRepository).save(token);
    }

    @Test
    void revokeRefreshToken_alreadyRevoked_noop() {
        User user = buildUser();
        RefreshToken token = new RefreshToken("jti-already-revoked", user, Instant.now().plusSeconds(86400));
        token.revoke();

        when(refreshTokenRepository.findById("jti-already-revoked")).thenReturn(Optional.of(token));

        tokenService.revokeRefreshToken("jti-already-revoked");

        // save should NOT be called again since it's already revoked
        verify(refreshTokenRepository, never()).save(any());
    }

    // --- helpers ---

    private static User buildUser() {
        User u = new User("alice", "alice@test.com", "hashed");
        u.setId(UUID.randomUUID());
        return u;
    }

    private Claims mockClaims(User user) {
        Claims claims = mock(Claims.class);
        when(claims.get("uid", String.class)).thenReturn(user.getId().toString());
        when(claims.getSubject()).thenReturn(user.getUsername());
        return claims;
    }
}
