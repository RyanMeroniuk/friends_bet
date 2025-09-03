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

    /** Button 1: refresh odds/games for betting */
    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refresh(@RequestParam(defaultValue = "all") String sport) {
        if ("all".equalsIgnoreCase(sport)) odds.refreshAll();
        else odds.refreshForSport(sport);
        return ResponseEntity.ok(Map.of("status", "ok", "refreshed", sport));
    }

    /** Button 2: settle all completed games (pull scores on demand) */
    @PostMapping("/scores/refresh")
    public ResponseEntity<ScoreSyncService.ScoreSyncSummary> refreshScores(
            @RequestParam(defaultValue = "all") String sport,
            @RequestParam(required = false) Integer daysFrom
    ) {
        var summary = scoreSync.refreshScores(sport, daysFrom);
        return ResponseEntity.ok(summary);
    }

    /** Manual override: finalize a specific game with explicit scores */
    @PostMapping("/games/{gameId}/final")
    public ResponseEntity<Map<String, Object>> finalizeGame(
            @PathVariable UUID gameId,
            @RequestParam("homeScore") int homeScore,
            @RequestParam("awayScore") int awayScore
    ) {
        int settled = settlement.setFinalScore(gameId, homeScore, awayScore);
        return ResponseEntity.ok(Map.of(
                "gameId", gameId,
                "homeScore", homeScore,
                "awayScore", awayScore,
                "settledBets", settled
        ));
    }

    /** Manual re-run of settlement for an already-final game */
    @PostMapping("/games/{gameId}/settle")
    public ResponseEntity<Map<String, Object>> settle(@PathVariable UUID gameId) {
        int settled = settlement.settleGame(gameId);
        return ResponseEntity.ok(Map.of("gameId", gameId, "settledBets", settled));
    }
}
