package com.ryanmeroniuk.friends_bet.dto;

import java.time.Instant;
import java.util.UUID;

public class AuthResponse {

    private UUID id;
    private String username;
    private String email;
    private Instant createdAt;
    private String token;

    public AuthResponse(UUID id, String username, String email, Instant createdAt, String token){
        this.id = id;
        this.username = username;
        this.email = email;
        this.createdAt = createdAt;
        this.token = token;
    }
}
