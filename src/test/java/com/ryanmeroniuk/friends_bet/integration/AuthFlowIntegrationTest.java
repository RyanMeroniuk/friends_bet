package com.ryanmeroniuk.friends_bet.integration;

import com.ryanmeroniuk.friends_bet.dto.AccessTokenResponse;
import com.ryanmeroniuk.friends_bet.dto.CreateUserRequest;
import com.ryanmeroniuk.friends_bet.dto.LoginRequest;
import com.ryanmeroniuk.friends_bet.dto.UserProfileResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class AuthFlowIntegrationTest {

    @Autowired
    private TestRestTemplate rest;

    @Test
    void fullAuthFlow() {
        // 1) Register
        CreateUserRequest regReq = new CreateUserRequest();
        regReq.setUsername("flowuser");
        regReq.setEmail("flowuser@example.com");
        regReq.setPassword("password123");

        ResponseEntity<AccessTokenResponse> regResp = rest.postForEntity(
                "/api/users/register", regReq, AccessTokenResponse.class);
        assertThat(regResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String accessToken = regResp.getBody().getAccessToken();
        assertThat(accessToken).isNotBlank();

        // Extract refresh cookie
        String refreshCookie = extractRefreshCookie(regResp);
        assertThat(refreshCookie).isNotNull();

        // 2) Login
        LoginRequest loginReq = new LoginRequest();
        loginReq.setUsernameOrEmail("flowuser");
        loginReq.setPassword("password123");

        ResponseEntity<AccessTokenResponse> loginResp = rest.postForEntity(
                "/api/users/login", loginReq, AccessTokenResponse.class);
        assertThat(loginResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        accessToken = loginResp.getBody().getAccessToken();
        refreshCookie = extractRefreshCookie(loginResp);

        // 3) Access /me with token
        HttpHeaders meHeaders = new HttpHeaders();
        meHeaders.setBearerAuth(accessToken);
        ResponseEntity<UserProfileResponse> meResp = rest.exchange(
                "/api/users/me", HttpMethod.GET, new HttpEntity<>(meHeaders), UserProfileResponse.class);
        assertThat(meResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(meResp.getBody().getUsername()).isEqualTo("flowuser");
        assertThat(meResp.getBody().getEmail()).isEqualTo("flowuser@example.com");

        // 4) Refresh
        HttpHeaders refreshHeaders = new HttpHeaders();
        refreshHeaders.add("Cookie", "refresh=" + refreshCookie);
        ResponseEntity<AccessTokenResponse> refreshResp = rest.exchange(
                "/api/users/refresh", HttpMethod.POST, new HttpEntity<>(refreshHeaders), AccessTokenResponse.class);
        assertThat(refreshResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        String newAccessToken = refreshResp.getBody().getAccessToken();
        assertThat(newAccessToken).isNotBlank();

        // 5) Logout
        HttpHeaders logoutHeaders = new HttpHeaders();
        String newRefreshCookie = extractRefreshCookie(refreshResp);
        if (newRefreshCookie != null) {
            logoutHeaders.add("Cookie", "refresh=" + newRefreshCookie);
        }
        ResponseEntity<Void> logoutResp = rest.exchange(
                "/api/users/logout", HttpMethod.POST, new HttpEntity<>(logoutHeaders), Void.class);
        assertThat(logoutResp.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        // 6) /me should return 401 without token
        ResponseEntity<String> meUnauth = rest.getForEntity("/api/users/me", String.class);
        assertThat(meUnauth.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void duplicateRegistration_returns400() {
        CreateUserRequest req = new CreateUserRequest();
        req.setUsername("dupeuser");
        req.setEmail("dupeuser@example.com");
        req.setPassword("password123");

        ResponseEntity<AccessTokenResponse> first = rest.postForEntity(
                "/api/users/register", req, AccessTokenResponse.class);
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        // Second registration with same username
        CreateUserRequest dupe = new CreateUserRequest();
        dupe.setUsername("dupeuser");
        dupe.setEmail("dupe2@example.com");
        dupe.setPassword("password123");

        ResponseEntity<String> second = rest.postForEntity(
                "/api/users/register", dupe, String.class);
        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void loginWithEmail_works() {
        CreateUserRequest regReq = new CreateUserRequest();
        regReq.setUsername("emaillogin");
        regReq.setEmail("emaillogin@example.com");
        regReq.setPassword("password123");
        rest.postForEntity("/api/users/register", regReq, AccessTokenResponse.class);

        LoginRequest loginReq = new LoginRequest();
        loginReq.setUsernameOrEmail("emaillogin@example.com");
        loginReq.setPassword("password123");

        ResponseEntity<AccessTokenResponse> loginResp = rest.postForEntity(
                "/api/users/login", loginReq, AccessTokenResponse.class);
        assertThat(loginResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(loginResp.getBody().getAccessToken()).isNotBlank();
    }

    @Test
    void expiredRefreshToken_returns401() {
        HttpHeaders headers = new HttpHeaders();
        headers.add("Cookie", "refresh=totally-invalid-token");
        ResponseEntity<String> resp = rest.exchange(
                "/api/users/refresh", HttpMethod.POST, new HttpEntity<>(headers), String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    // ── Helpers ──

    private String extractRefreshCookie(ResponseEntity<?> response) {
        List<String> cookies = response.getHeaders().get("Set-Cookie");
        if (cookies == null) return null;
        for (String cookie : cookies) {
            if (cookie.startsWith("refresh=")) {
                String value = cookie.substring("refresh=".length());
                int semicolon = value.indexOf(';');
                return semicolon > 0 ? value.substring(0, semicolon) : value;
            }
        }
        return null;
    }
}
