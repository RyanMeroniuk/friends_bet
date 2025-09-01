package com.ryanmeroniuk.friends_bet.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "games")
public class Game {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "external_game_id", nullable = false, unique = true)
    private String externalGameId;

    @Column(name = "home_team", nullable = false)
    private String homeTeam;

    @Column(name = "away_team", nullable = false)
    private String awayTeam;

    @Column(name = "start_time", nullable = false)
    private Instant startTime;

    @Column(name = "sport")
    private String sport;

    public Game() {}

    public Game(String externalGameId, String homeTeam, String awayTeam, Instant startTime) {
        this.externalGameId = externalGameId;
        this.homeTeam = homeTeam;
        this.awayTeam = awayTeam;
        this.startTime = startTime;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getExternalGameId() { return externalGameId; }
    public void setExternalGameId(String externalGameId) { this.externalGameId = externalGameId; }

    public String getHomeTeam() { return homeTeam; }
    public void setHomeTeam(String homeTeam) { this.homeTeam = homeTeam; }

    public String getAwayTeam() { return awayTeam; }
    public void setAwayTeam(String awayTeam) { this.awayTeam = awayTeam; }

    public Instant getStartTime() { return startTime; }
    public void setStartTime(Instant startTime) { this.startTime = startTime; }

    public String getSport() { return sport; }
    public void setSport(String sport) { this.sport = sport; }
}
