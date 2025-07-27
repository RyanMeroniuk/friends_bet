package com.ryanmeroniuk.friends_bet.model;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "wallets",
        uniqueConstraints = @UniqueConstraint(columnNames = {"group_id", "user_id"}))
public class Wallet {

    @Id @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private long balanceCents = 0;

    public Wallet() {}

    public Wallet(Group group, User user) {
        this.group = group;
        this.user = user;
        this.balanceCents = 0;
    }

    public UUID getId() { return id; }
    public Group getGroup() { return group; }
    public User getUser() { return user; }
    public long getBalanceCents() { return balanceCents; }

    public void setBalanceCents(long balanceCents) {
        this.balanceCents = balanceCents;
    }
}
