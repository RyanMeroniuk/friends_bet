package com.ryanmeroniuk.friends_bet.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ryanmeroniuk.friends_bet.dto.WalletDepositRequest;
import com.ryanmeroniuk.friends_bet.dto.WalletResponse;
import com.ryanmeroniuk.friends_bet.config.SecurityConfig;
import com.ryanmeroniuk.friends_bet.filter.AdminSecretFilter;
import com.ryanmeroniuk.friends_bet.filter.JwtAuthenticationFilter;
import com.ryanmeroniuk.friends_bet.service.UserDetailsService;
import com.ryanmeroniuk.friends_bet.service.WalletService;
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

import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(WalletController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, AdminSecretFilter.class})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WalletControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private WalletService walletService;

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

    // ── Deposit ──

    @Test
    void deposit_200_returnsWalletResponse() throws Exception {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        WalletResponse resp = new WalletResponse(userId, 5000);
        when(walletService.deposit(eq(groupId), any(WalletDepositRequest.class))).thenReturn(resp);

        WalletDepositRequest req = new WalletDepositRequest(userId, 5000);

        mockMvc.perform(post("/api/groups/{groupId}/wallets/deposit", groupId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(userId.toString()))
                .andExpect(jsonPath("$.balanceCents").value(5000));
    }

    @Test
    void deposit_400_nullUserId() throws Exception {
        UUID groupId = UUID.randomUUID();
        String body = "{\"amountCents\": 5000}";

        mockMvc.perform(post("/api/groups/{groupId}/wallets/deposit", groupId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.userId").exists());
    }

    @Test
    void deposit_401_noAuth() throws Exception {
        UUID groupId = UUID.randomUUID();
        WalletDepositRequest req = new WalletDepositRequest(UUID.randomUUID(), 5000);

        mockMvc.perform(post("/api/groups/{groupId}/wallets/deposit", groupId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // ── List Balances ──

    @Test
    void listBalances_200() throws Exception {
        UUID groupId = UUID.randomUUID();
        List<WalletResponse> wallets = List.of(
                new WalletResponse(UUID.randomUUID(), 3000),
                new WalletResponse(UUID.randomUUID(), 7000)
        );
        when(walletService.listBalances(groupId)).thenReturn(wallets);

        mockMvc.perform(get("/api/groups/{groupId}/wallets", groupId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].balanceCents").value(3000))
                .andExpect(jsonPath("$[1].balanceCents").value(7000));
    }
}
