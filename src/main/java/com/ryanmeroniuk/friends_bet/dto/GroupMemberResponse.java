package com.ryanmeroniuk.friends_bet.dto;

import java.time.Instant;
import java.util.UUID;

public class GroupMemberResponse {

    private UUID id;
    private UUID groupId;
    private UUID userId;
    private Instant joinedAt;
    private String username;

    public GroupMemberResponse(UUID id, UUID groupId, UUID userId, Instant joinedAt, String username){
        this.id = id;
        this.groupId = groupId;
        this.userId = userId;
        this.joinedAt = joinedAt;
        this.username = username;
    }

    public UUID getId() {
        return id; }

    public UUID getGroupId() {
        return groupId; }

    public UUID getUserId() {
        return userId; }

    public Instant getJoinedAt() {
        return joinedAt; }

    public String getUsername() {
        return username;
    }
}
