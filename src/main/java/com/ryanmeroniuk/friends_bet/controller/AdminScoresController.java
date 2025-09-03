package com.ryanmeroniuk.friends_bet.controller;

import com.ryanmeroniuk.friends_bet.service.SettlementService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminScoresController {

    private final SettlementService settlement;

    public AdminScoresController(SettlementService settlement) {
        this.settlement = settlement;
    }

    /** Manually mark a game final and settle bets. */
    @PostMapping("/games/{gameId}/final")
    public ResponseEntity<?> finalizeGame(
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

    /** If the game is already final in DB, re-run settlement. */
    @PostMapping("/games/{gameId}/settle")
    public ResponseEntity<?> settle(@PathVariable UUID gameId) {
        int settled = settlement.settleGame(gameId);
        return ResponseEntity.ok(Map.of("gameId", gameId, "settledBets", settled));
    }
}
