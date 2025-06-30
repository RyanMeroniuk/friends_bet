package com.ryanmeroniuk.friends_bet.dto;

import com.ryanmeroniuk.friends_bet.model.Group;

import java.time.Instant;
import java.util.UUID;

public class GroupResponse {

    private final UUID id;
    private final String name;
    private final Instant createdAt;
    private final String inviteCode;

    public GroupResponse (UUID id, String name, String inviteCode, Instant createdAt){

        this.id = id;
        this.name = name;
        this.inviteCode = inviteCode;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getInviteCode() {
        return inviteCode;
    }
}
