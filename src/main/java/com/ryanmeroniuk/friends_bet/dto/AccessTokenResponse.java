package com.ryanmeroniuk.friends_bet.dto;

public class AccessTokenResponse {
    private String accessToken;

    public AccessTokenResponse() {
    }

    public AccessTokenResponse(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }
}
