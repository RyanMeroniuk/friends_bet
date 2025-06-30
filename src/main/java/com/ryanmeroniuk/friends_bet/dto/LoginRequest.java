package com.ryanmeroniuk.friends_bet.dto;

public class LoginRequest {

    private String usernameOrEmail;
    private String password;

    public LoginRequest(){}

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getUsernameOrEmail() {
        return usernameOrEmail;
    }

    public void setUsernameOrEmail(String username) {
        this.usernameOrEmail = username;
    }
}
