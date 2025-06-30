package com.ryanmeroniuk.friends_bet.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "groups")
public class Group {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String inviteCode;

    @Column(nullable = false, updatable = false)
    private final Instant createdAt = Instant.now();

    public Group() {}

    public Group(String name){
        this.name = name;
        this.inviteCode = UUID.randomUUID()
                            .toString()
                            .substring(0,8);
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getInviteCode() {
        return inviteCode;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setName(String name){
        this.name = name;
    }
}
