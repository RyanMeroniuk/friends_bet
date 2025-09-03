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

    // ==== NEW: fields used for settlement ====

    /** Final home team score (nullable until game ends). */
    @Column(name = "home_score")
    private Integer homeScore;

    /** Final away team score (nullable until game ends). */
    @Column(name = "away_score")
    private Integer awayScore;

    /** True once the game has a final score and bets may be settled. */
    @Column(name = "is_final", nullable = false)
    private boolean isFinal = false;

    /** When we marked this game final. */
    @Column(name = "final_at")
    private Instant finalAt;

    // ==== constructors ====

    public Game() {}

    public Game(String externalGameId, String homeTeam, String awayTeam, Instant startTime) {
        this.externalGameId = externalGameId;
        this.homeTeam = homeTeam;
        this.awayTeam = awayTeam;
        this.startTime = startTime;
    }

    // ==== getters / setters ====

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

    public Integer getHomeScore() { return homeScore; }
    public void setHomeScore(Integer homeScore) { this.homeScore = homeScore; }

    public Integer getAwayScore() { return awayScore; }
    public void setAwayScore(Integer awayScore) { this.awayScore = awayScore; }

    public boolean isFinal() { return isFinal; }
    public void setFinal(boolean aFinal) { isFinal = aFinal; }

    public Instant getFinalAt() { return finalAt; }
    public void setFinalAt(Instant finalAt) { this.finalAt = finalAt; }
}
