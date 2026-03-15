package com.ryanmeroniuk.friends_bet.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateGroupRequest {

    @NotBlank(message = "Group name is required")
    @Size(min = 2, max = 50, message = "Group name must be between 2 and 50 characters")
    private String name;

    public CreateGroupRequest (){}

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
