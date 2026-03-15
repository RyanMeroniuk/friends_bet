package com.ryanmeroniuk.friends_bet.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ryanmeroniuk.friends_bet.dto.AcceptBetRequest;
import com.ryanmeroniuk.friends_bet.dto.BetResponse;
import com.ryanmeroniuk.friends_bet.dto.CreateBetRequest;
import com.ryanmeroniuk.friends_bet.config.SecurityConfig;
import com.ryanmeroniuk.friends_bet.filter.AdminSecretFilter;
import com.ryanmeroniuk.friends_bet.filter.JwtAuthenticationFilter;
import com.ryanmeroniuk.friends_bet.service.BetService;
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
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.User;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BetController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, AdminSecretFilter.class})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BetControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private BetService betService;

    @MockitoBean
    private SettlementService settlementService;

    @MockitoBean
    private ScoreSyncService scoreSyncService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private UserDetailsService userDetailsService;

    private String accessToken;

    @BeforeEach
    void setUpAuth() {
        UUID userId = UUID.randomUUID();
        String username = "testuser";
        accessToken = TestJwtHelper.generateAccessToken(username, userId);

        Claims claims = new io.jsonwebtoken.impl.DefaultClaims();
        claims.setSubject(username);
        claims.put("token_type", "access");
        claims.put("uid", userId.toString());

        when(jwtUtil.parseAndValidate(accessToken)).thenReturn(claims);
        when(userDetailsService.loadUserByUsername(username)).thenReturn(
                User.builder().username(username).password("pw").roles("USER").build());
    }

    // ── Propose ──

    @Test
    void proposeBet_201_returnsBet() throws Exception {
        UUID groupId = UUID.randomUUID();
        UUID gameId = UUID.randomUUID();
        BetResponse resp = buildBetResponse(groupId, gameId);
        when(betService.propose(any(CreateBetRequest.class))).thenReturn(resp);

        CreateBetRequest req = new CreateBetRequest();
        req.setGroupId(groupId);
        req.setGameId(gameId);
        req.setMarketType("WINNER");
        req.setPick("HOME");
        req.setAmountCents(1000);
        req.setOdds(1.5);

        mockMvc.perform(post("/api/groups/{groupId}/bets", groupId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.groupId").value(groupId.toString()))
                .andExpect(jsonPath("$.marketType").value("WINNER"))
                .andExpect(jsonPath("$.amountCents").value(1000));
    }

    @Test
    void proposeBet_400_missingFields() throws Exception {
        UUID groupId = UUID.randomUUID();
        CreateBetRequest req = new CreateBetRequest();
        req.setGroupId(groupId);

        mockMvc.perform(post("/api/groups/{groupId}/bets", groupId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.gameId").exists())
                .andExpect(jsonPath("$.fields.marketType").exists())
                .andExpect(jsonPath("$.fields.pick").exists());
    }

    @Test
    void proposeBet_400_groupIdMismatch() throws Exception {
        UUID pathGroupId = UUID.randomUUID();
        UUID bodyGroupId = UUID.randomUUID();

        CreateBetRequest req = new CreateBetRequest();
        req.setGroupId(bodyGroupId);
        req.setGameId(UUID.randomUUID());
        req.setMarketType("WINNER");
        req.setPick("HOME");
        req.setAmountCents(1000);
        req.setOdds(1.5);

        mockMvc.perform(post("/api/groups/{groupId}/bets", pathGroupId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void proposeBet_401_noAuth() throws Exception {
        UUID groupId = UUID.randomUUID();
        CreateBetRequest req = new CreateBetRequest();
        req.setGroupId(groupId);
        req.setGameId(UUID.randomUUID());
        req.setMarketType("WINNER");
        req.setPick("HOME");
        req.setAmountCents(1000);
        req.setOdds(1.5);

        mockMvc.perform(post("/api/groups/{groupId}/bets", groupId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // ── List ──

    @Test
    void listBets_200() throws Exception {
        UUID groupId = UUID.randomUUID();
        List<BetResponse> bets = List.of(
                buildBetResponse(groupId, UUID.randomUUID()),
                buildBetResponse(groupId, UUID.randomUUID())
        );
        when(betService.listByGroup(groupId)).thenReturn(bets);

        mockMvc.perform(get("/api/groups/{groupId}/bets", groupId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    // ── Accept ──

    @Test
    void acceptBet_200() throws Exception {
        UUID betId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        BetResponse resp = new BetResponse(
                betId, groupId, UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                "WINNER", "HOME", 1000, 500, 1.5,
                "ACCEPTED", Instant.now(), null, null, null, null, null);
        when(betService.accept(eq(betId), any(AcceptBetRequest.class))).thenReturn(resp);

        AcceptBetRequest req = new AcceptBetRequest();
        req.setAcceptorId(UUID.randomUUID());

        mockMvc.perform(post("/api/bets/{betId}/accept", betId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));
    }

    // ── Settle ──

    @Test
    void settleAccepted_200() throws Exception {
        UUID groupId = UUID.randomUUID();
        // ensureGroupExists is void — default mock does nothing
        when(betService.sportsForAcceptedBets(groupId)).thenReturn(Set.of("basketball_nba"));
        when(settlementService.settleAcceptedBetsForGroup(groupId)).thenReturn(3);

        mockMvc.perform(post("/api/groups/{groupId}/bets/settle-accepted", groupId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.settled").value(3))
                .andExpect(jsonPath("$.sportsRefreshed").isArray());
    }

    // ── Helpers ──

    private BetResponse buildBetResponse(UUID groupId, UUID gameId) {
        return new BetResponse(
                UUID.randomUUID(), groupId, gameId, UUID.randomUUID(), null,
                "WINNER", "HOME", 1000, 0, 1.5,
                "OPEN", Instant.now(), null, null, null, null, null);
    }
}
