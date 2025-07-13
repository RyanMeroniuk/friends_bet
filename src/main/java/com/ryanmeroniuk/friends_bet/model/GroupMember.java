package com.ryanmeroniuk.friends_bet.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "group_members")
public class GroupMember {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, updatable = false)
    private final Instant joinedAt = Instant.now();

    public GroupMember(){}

    public GroupMember(Group group, User user){
        this.group = group;
        this.user = user;
    }

    public UUID getId() {
        return id;
    }

    public Group getGroup() {
        return group;
    }

    public User getUser() {
        return user;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }
}
