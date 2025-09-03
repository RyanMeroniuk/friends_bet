package com.ryanmeroniuk.friends_bet.controller;

import com.ryanmeroniuk.friends_bet.service.OddsService;
import com.ryanmeroniuk.friends_bet.service.ScoreSyncService;
import com.ryanmeroniuk.friends_bet.service.SettlementService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final OddsService odds;
    private final ScoreSyncService scoreSync;
    private final SettlementService settlement;

    public AdminController(OddsService odds,
                           ScoreSyncService scoreSync,
                           SettlementService settlement) {
        this.odds = odds;
        this.scoreSync = scoreSync;
        this.settlement = settlement;
    }

    /** Button 1: refresh odds/games for one sport or all */
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshOdds(@RequestParam(defaultValue = "all") String sport) {
        if ("all".equalsIgnoreCase(sport)) {
            odds.refreshAll();
        } else {
            odds.refreshForSport(sport);
        }
        return ResponseEntity.ok(Map.of("status", "ok", "sport", sport));
    }

    /** Button 2: refresh scores & settle completed games (one sport or all) */
    @PostMapping("/scores/refresh")
    public ResponseEntity<?> refreshScores(@RequestParam(defaultValue = "all") String sport) {
        if ("all".equalsIgnoreCase(sport)) {
            scoreSync.refreshScoresAll();
        } else {
            scoreSync.refreshScoresForSport(sport);
        }
        return ResponseEntity.ok(Map.of("status", "ok", "sport", sport));
    }

    /** Manual override: mark specific game final with explicit scores */
    @PostMapping("/games/{gameId}/final")
    public ResponseEntity<?> finalizeGame(@PathVariable UUID gameId,
                                          @RequestParam int homeScore,
                                          @RequestParam int awayScore) {
        int settled = settlement.setFinalScore(gameId, homeScore, awayScore);
        return ResponseEntity.ok(Map.of(
                "gameId", gameId,
                "homeScore", homeScore,
                "awayScore", awayScore,
                "settledBets", settled
        ));
    }

    /** Re-run settlement for a game already marked final */
    @PostMapping("/games/{gameId}/settle")
    public ResponseEntity<?> settle(@PathVariable UUID gameId) {
        int settled = settlement.settleGame(gameId);
        return ResponseEntity.ok(Map.of("gameId", gameId, "settledBets", settled));
    }
}
