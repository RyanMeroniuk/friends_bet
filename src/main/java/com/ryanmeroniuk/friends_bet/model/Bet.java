package com.ryanmeroniuk.friends_bet.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "bets")
public class Bet {
    @Id @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @ManyToOne(optional = false)
    @JoinColumn(name = "proposer_id", nullable = false)
    private User proposer;

    @ManyToOne
    @JoinColumn(name = "acceptor_id")
    private User acceptor;

    @ManyToOne(optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @Column(nullable = false)
    private String marketType;

    @Column(nullable = false)
    private String pick;

    @Column(nullable = false)
    private long amountCents;

    @Column(nullable = false)
    private double odds;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column
    private Instant resolvedAt;

    // JPA constructor
    public Bet() {}


    public Bet(Group group, User proposer, Game game,
               String marketType, String pick,
               long amountCents, double odds) {
        this.group = group;
        this.proposer = proposer;
        this.game = game;
        this.marketType = marketType;
        this.pick = pick;
        this.amountCents = amountCents;
        this.odds = odds;
        this.status = "OPEN";
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Group getGroup() {
        return group;
    }

    public void setGroup(Group group) {
        this.group = group;
    }

    public User getProposer() {
        return proposer;
    }

    public void setProposer(User proposer) {
        this.proposer = proposer;
    }

    public User getAcceptor() {
        return acceptor;
    }

    public void setAcceptor(User acceptor) {
        this.acceptor = acceptor;
    }

    public Game getGame() {
        return game;
    }

    public void setGame(Game game) {
        this.game = game;
    }

    public String getMarketType() {
        return marketType;
    }

    public void setMarketType(String marketType) {
        this.marketType = marketType;
    }

    public String getPick() {
        return pick;
    }

    public void setPick(String pick) {
        this.pick = pick;
    }

    public long getAmountCents() {
        return amountCents;
    }

    public void setAmountCents(long amountCents) {
        this.amountCents = amountCents;
    }

    public double getOdds() {
        return odds;
    }

    public void setOdds(double odds) {
        this.odds = odds;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(Instant resolvedAt) {
        this.resolvedAt = resolvedAt;
    }
}
