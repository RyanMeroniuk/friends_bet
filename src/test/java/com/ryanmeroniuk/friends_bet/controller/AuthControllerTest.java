package com.ryanmeroniuk.friends_bet.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ryanmeroniuk.friends_bet.dto.CreateUserRequest;
import com.ryanmeroniuk.friends_bet.dto.LoginRequest;
import com.ryanmeroniuk.friends_bet.config.SecurityConfig;
import com.ryanmeroniuk.friends_bet.filter.AdminSecretFilter;
import com.ryanmeroniuk.friends_bet.filter.JwtAuthenticationFilter;
import com.ryanmeroniuk.friends_bet.model.User;
import com.ryanmeroniuk.friends_bet.service.TokenService;
import com.ryanmeroniuk.friends_bet.service.UserDetailsService;
import com.ryanmeroniuk.friends_bet.service.UserService;
import com.ryanmeroniuk.friends_bet.support.TestJwtHelper;
import com.ryanmeroniuk.friends_bet.util.JwtUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Duration;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, AdminSecretFilter.class,
        com.ryanmeroniuk.friends_bet.filter.RateLimitFilter.class,
        com.ryanmeroniuk.friends_bet.service.TokenDenyListService.class})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private TokenService tokenService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private UserDetailsService userDetailsService;

    // ── Register ──

    @Test
    void register_201_returnsAccessToken() throws Exception {
        User user = buildUser();
        TokenService.TokenPair pair = new TokenService.TokenPair("access-jwt", "refresh-jwt");

        when(userService.register(any(CreateUserRequest.class))).thenReturn(user);
        when(tokenService.issueTokenPair(user)).thenReturn(pair);
        when(tokenService.getRefreshTokenTtl()).thenReturn(Duration.ofDays(14));

        CreateUserRequest req = new CreateUserRequest();
        req.setUsername("testuser");
        req.setEmail("test@example.com");
        req.setPassword("password123");

        mockMvc.perform(post("/api/users/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").value("access-jwt"))
                .andExpect(header().string("Set-Cookie", containsString("refresh=refresh-jwt")));
    }

    @Test
    void register_400_blankUsername() throws Exception {
        CreateUserRequest req = new CreateUserRequest();
        req.setUsername("");
        req.setEmail("test@example.com");
        req.setPassword("password123");

        mockMvc.perform(post("/api/users/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.username").exists());
    }

    @Test
    void register_400_invalidEmail() throws Exception {
        CreateUserRequest req = new CreateUserRequest();
        req.setUsername("testuser");
        req.setEmail("not-an-email");
        req.setPassword("password123");

        mockMvc.perform(post("/api/users/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.email").exists());
    }

    @Test
    void register_400_shortPassword() throws Exception {
        CreateUserRequest req = new CreateUserRequest();
        req.setUsername("testuser");
        req.setEmail("test@example.com");
        req.setPassword("short");

        mockMvc.perform(post("/api/users/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.password").exists());
    }

    @Test
    void register_400_duplicateUsername() throws Exception {
        when(userService.register(any(CreateUserRequest.class)))
                .thenThrow(new IllegalArgumentException("Username already in use"));

        CreateUserRequest req = new CreateUserRequest();
        req.setUsername("testuser");
        req.setEmail("test@example.com");
        req.setPassword("password123");

        mockMvc.perform(post("/api/users/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // ── Login ──

    @Test
    void login_200_returnsAccessToken() throws Exception {
        User user = buildUser();
        TokenService.TokenPair pair = new TokenService.TokenPair("access-jwt", "refresh-jwt");

        when(userService.login(any(LoginRequest.class))).thenReturn(user);
        when(tokenService.issueTokenPair(user)).thenReturn(pair);
        when(tokenService.getRefreshTokenTtl()).thenReturn(Duration.ofDays(14));

        LoginRequest req = new LoginRequest();
        req.setUsernameOrEmail("testuser");
        req.setPassword("password123");

        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-jwt"))
                .andExpect(header().string("Set-Cookie", containsString("refresh=refresh-jwt")));
    }

    @Test
    void login_401_invalidCredentials() throws Exception {
        when(userService.login(any(LoginRequest.class)))
                .thenThrow(new IllegalArgumentException("Invalid credentials"));

        LoginRequest req = new LoginRequest();
        req.setUsernameOrEmail("testuser");
        req.setPassword("wrong");

        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_400_blankFields() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setUsernameOrEmail("");
        req.setPassword("");

        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.usernameOrEmail").exists());
    }

    // ── Refresh ──

    @Test
    void refresh_200_rotatesTokens() throws Exception {
        String jti = UUID.randomUUID().toString();
        UUID userId = UUID.randomUUID();
        String refreshToken = TestJwtHelper.generateRefreshToken("testuser", userId, jti);
        TokenService.TokenPair newPair = new TokenService.TokenPair("new-access", "new-refresh");

        Claims claims = new io.jsonwebtoken.impl.DefaultClaims();
        claims.setId(jti);
        claims.setSubject("testuser");
        claims.put("token_type", "refresh");
        claims.put("uid", userId.toString());

        when(jwtUtil.parseAndValidate(refreshToken)).thenReturn(claims);
        when(tokenService.rotateRefreshToken(anyString(), any(Claims.class))).thenReturn(newPair);
        when(tokenService.getRefreshTokenTtl()).thenReturn(Duration.ofDays(14));

        mockMvc.perform(post("/api/users/refresh")
                        .cookie(new Cookie("refresh", refreshToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("new-access"))
                .andExpect(header().string("Set-Cookie", containsString("refresh=new-refresh")));
    }

    @Test
    void refresh_401_missingCookie() throws Exception {
        mockMvc.perform(post("/api/users/refresh"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refresh_401_invalidToken() throws Exception {
        when(jwtUtil.parseAndValidate(anyString())).thenThrow(new JwtException("bad token"));

        mockMvc.perform(post("/api/users/refresh")
                        .cookie(new Cookie("refresh", "invalid-token")))
                .andExpect(status().isUnauthorized());
    }

    // ── Logout ──

    @Test
    void logout_204_clearsCookie() throws Exception {
        mockMvc.perform(post("/api/users/logout"))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));
    }

    // ── Me ──

    @Test
    void me_200_returnsProfile() throws Exception {
        UUID userId = UUID.randomUUID();
        String username = "testuser";
        User user = buildUser(userId, username);

        when(userService.requireByUsername(username)).thenReturn(user);

        // Set up JwtUtil and UserDetailsService so the real JwtAuthenticationFilter authenticates
        String accessToken = TestJwtHelper.generateAccessToken(username, userId);
        Claims claims = new io.jsonwebtoken.impl.DefaultClaims();
        claims.setSubject(username);
        claims.put("token_type", "access");
        claims.put("uid", userId.toString());

        when(jwtUtil.parseAndValidate(accessToken)).thenReturn(claims);
        when(userDetailsService.loadUserByUsername(username)).thenReturn(
                org.springframework.security.core.userdetails.User.builder()
                        .username(username).password("hashed").roles("USER").build());

        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(userId.toString()))
                .andExpect(jsonPath("$.username").value(username))
                .andExpect(jsonPath("$.email").value("test@example.com"));
    }

    @Test
    void me_401_unauthenticated() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    // ── Helpers ──

    private User buildUser() {
        return buildUser(UUID.randomUUID(), "testuser");
    }

    private User buildUser(UUID id, String username) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setEmail("test@example.com");
        user.setPasswordHash("hashed");
        return user;
    }
}
