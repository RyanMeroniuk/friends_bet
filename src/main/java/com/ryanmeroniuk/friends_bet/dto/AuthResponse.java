package com.ryanmeroniuk.friends_bet.dto;

import java.time.Instant;
import java.util.UUID;

public class AuthResponse {
    private UUID id;
    private String username;
    private String email;
    private Instant createdAt;
    private String token;

    // Jackson needs a no-arg constructor:
    public AuthResponse() {}

    public AuthResponse(UUID id, String username, String email, Instant createdAt, String token) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.createdAt = createdAt;
        this.token = token;
    }

    public UUID getId() { return id; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public Instant getCreatedAt() { return createdAt; }
    public String getToken() { return token; }

}
