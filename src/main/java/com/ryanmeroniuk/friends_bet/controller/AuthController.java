package com.ryanmeroniuk.friends_bet.controller;

import com.ryanmeroniuk.friends_bet.dto.AccessTokenResponse;
import com.ryanmeroniuk.friends_bet.dto.CreateUserRequest;
import com.ryanmeroniuk.friends_bet.dto.LoginRequest;
import com.ryanmeroniuk.friends_bet.dto.UserProfileResponse;
import com.ryanmeroniuk.friends_bet.model.User;
import com.ryanmeroniuk.friends_bet.service.TokenService;
import com.ryanmeroniuk.friends_bet.service.UserService;
import com.ryanmeroniuk.friends_bet.util.JwtUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.WebUtils;

import java.time.Duration;

@RestController
@RequestMapping(
        path = "/api/users",
        produces = MediaType.APPLICATION_JSON_VALUE
)
public class AuthController {

    private final UserService userService;
    private final TokenService tokenService;
    private final JwtUtil jwtUtil;

    public AuthController(UserService userService, TokenService tokenService, JwtUtil jwtUtil) {
        this.userService = userService;
        this.tokenService = tokenService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping(value = "/register", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AccessTokenResponse> register(@RequestBody CreateUserRequest req,
                                                        HttpServletResponse res) {
        User saved = userService.register(req);
        TokenService.TokenPair pair = tokenService.issueTokenPair(saved);
        writeRefreshCookie(res, pair.refreshToken());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new AccessTokenResponse(pair.accessToken()));
    }

    @PostMapping(value = "/login", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AccessTokenResponse> login(@RequestBody LoginRequest req,
                                                     HttpServletResponse res) {
        User user;
        try {
            user = userService.login(req);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, ex.getMessage());
        }

        TokenService.TokenPair pair = tokenService.issueTokenPair(user);
        writeRefreshCookie(res, pair.refreshToken());
        return ResponseEntity.ok(new AccessTokenResponse(pair.accessToken()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AccessTokenResponse> refresh(HttpServletRequest req,
                                                       HttpServletResponse res) {
        Cookie cookie = WebUtils.getCookie(req, "refresh");
        if (cookie == null || cookie.getValue() == null || cookie.getValue().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing refresh token");
        }

        Claims claims;
        try {
            claims = jwtUtil.parseAndValidate(cookie.getValue());
        } catch (JwtException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }

        String tokenType = claims.get("token_type", String.class);
        if (!"refresh".equals(tokenType)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token type");
        }

        String jti = claims.getId();
        if (jti == null || jti.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }

        TokenService.TokenPair pair;
        try {
            pair = tokenService.rotateRefreshToken(jti, claims);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, ex.getMessage());
        }

        writeRefreshCookie(res, pair.refreshToken());
        return ResponseEntity.ok(new AccessTokenResponse(pair.accessToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest req, HttpServletResponse res) {
        Cookie cookie = WebUtils.getCookie(req, "refresh");
        if (cookie != null && cookie.getValue() != null && !cookie.getValue().isBlank()) {
            try {
                Claims claims = jwtUtil.parseAndValidate(cookie.getValue());
                String jti = claims.getId();
                if (jti != null) {
                    tokenService.revokeRefreshToken(jti);
                }
            } catch (JwtException | IllegalArgumentException ignored) {
                // If parsing fails we still clear the cookie below.
            }
        }

        clearRefreshCookie(res);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public UserProfileResponse me(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }

        User user = userService.requireByUsername(authentication.getName());
        return new UserProfileResponse(user.getId(), user.getUsername(), user.getEmail(), user.getCreatedAt());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public String handleBadInput(IllegalArgumentException ex) {
        return ex.getMessage();
    }

    private void writeRefreshCookie(HttpServletResponse response, String refreshToken) {
        Duration maxAge = tokenService.getRefreshTokenTtl();
        ResponseCookie cookie = ResponseCookie.from("refresh", refreshToken)
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/api/users/refresh")
                .maxAge(maxAge)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("refresh", "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/api/users/refresh")
                .maxAge(Duration.ZERO)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
