package com.ryanmeroniuk.friends_bet.controller;

import com.ryanmeroniuk.friends_bet.config.SecurityConfig;
import com.ryanmeroniuk.friends_bet.filter.AdminSecretFilter;
import com.ryanmeroniuk.friends_bet.filter.JwtAuthenticationFilter;
import com.ryanmeroniuk.friends_bet.service.OddsService;
import com.ryanmeroniuk.friends_bet.service.ScoreSyncService;
import com.ryanmeroniuk.friends_bet.service.SettlementService;
import com.ryanmeroniuk.friends_bet.service.UserDetailsService;
import com.ryanmeroniuk.friends_bet.support.TestJwtHelper;
import com.ryanmeroniuk.friends_bet.util.JwtUtil;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.User;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, AdminSecretFilter.class,
        com.ryanmeroniuk.friends_bet.filter.RateLimitFilter.class,
        com.ryanmeroniuk.friends_bet.service.TokenDenyListService.class})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = "admin.secret=test-admin-secret")
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OddsService oddsService;

    @MockitoBean
    private ScoreSyncService scoreSyncService;

    @MockitoBean
    private SettlementService settlementService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private UserDetailsService userDetailsService;

    private String accessToken;

    @BeforeEach
    void setUpAuth() {
        UUID userId = UUID.randomUUID();
        String username = "admin";
        accessToken = TestJwtHelper.generateAccessToken(username, userId);

        Claims claims = new io.jsonwebtoken.impl.DefaultClaims();
        claims.setSubject(username);
        claims.put("token_type", "access");
        claims.put("uid", userId.toString());

        when(jwtUtil.parseAndValidate(accessToken)).thenReturn(claims);
        when(userDetailsService.loadUserByUsername(username)).thenReturn(
                User.builder().username(username).password("pw").roles("USER").build());
    }

    // ── Refresh odds ──

    @Test
    void refresh_200() throws Exception {
        mockMvc.perform(post("/api/admin/refresh")
                        .param("sport", "basketball_nba")
                        .header("Authorization", "Bearer " + accessToken)
                        .header("X-Admin-Secret", "test-admin-secret"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.refreshed").value("basketball_nba"));
    }

    // ── Refresh scores ──

    @Test
    void refreshScores_200() throws Exception {
        ScoreSyncService.ScoreSyncSummary summary = new ScoreSyncService.ScoreSyncSummary();
        when(scoreSyncService.refreshScores(eq("all"), isNull())).thenReturn(summary);

        mockMvc.perform(post("/api/admin/scores/refresh")
                        .header("Authorization", "Bearer " + accessToken)
                        .header("X-Admin-Secret", "test-admin-secret"))
                .andExpect(status().isOk());
    }

    // ── Finalize game ──

    @Test
    void finalizeGame_200() throws Exception {
        UUID gameId = UUID.randomUUID();
        when(settlementService.setFinalScore(gameId, 100, 98)).thenReturn(2);

        mockMvc.perform(post("/api/admin/games/{gameId}/final", gameId)
                        .param("homeScore", "100")
                        .param("awayScore", "98")
                        .header("Authorization", "Bearer " + accessToken)
                        .header("X-Admin-Secret", "test-admin-secret"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gameId").value(gameId.toString()))
                .andExpect(jsonPath("$.homeScore").value(100))
                .andExpect(jsonPath("$.awayScore").value(98))
                .andExpect(jsonPath("$.settledBets").value(2));
    }

    // ── Settle game ──

    @Test
    void settle_200() throws Exception {
        UUID gameId = UUID.randomUUID();
        when(settlementService.settleGame(gameId)).thenReturn(1);

        mockMvc.perform(post("/api/admin/games/{gameId}/settle", gameId)
                        .header("Authorization", "Bearer " + accessToken)
                        .header("X-Admin-Secret", "test-admin-secret"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gameId").value(gameId.toString()))
                .andExpect(jsonPath("$.settledBets").value(1));
    }

    // ── Auth required ──

    @Test
    void adminEndpoints_403_noAuth() throws Exception {
        // AdminSecretFilter runs before auth — missing secret header returns 403
        mockMvc.perform(post("/api/admin/refresh")
                        .param("sport", "basketball_nba"))
                .andExpect(status().isForbidden());
    }

    // ── Admin secret required ──

    @Test
    void adminEndpoints_403_noAdminSecret() throws Exception {
        mockMvc.perform(post("/api/admin/refresh")
                        .param("sport", "basketball_nba")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isForbidden());
    }
}
