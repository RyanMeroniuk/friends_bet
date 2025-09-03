package com.ryanmeroniuk.friends_bet.controller;

import com.ryanmeroniuk.friends_bet.service.OddsService;
import com.ryanmeroniuk.friends_bet.service.ScoreSyncService;
import com.ryanmeroniuk.friends_bet.service.SettlementService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final OddsService odds;
    private final ScoreSyncService scoreSync;
    private final SettlementService settlement;
    private final ScoreSyncService scoreSyncService;

    public AdminController(OddsService odds, ScoreSyncService scoreSync, SettlementService settlement,
                            ScoreSyncService scoreSyncService) {
        this.odds = odds;
        this.scoreSync = scoreSync;
        this.settlement = settlement;
        this.scoreSyncService = scoreSyncService;
    }

    @PostMapping("/refresh")
    public void refresh(@RequestParam(defaultValue = "all") String sport) {
        if ("all".equalsIgnoreCase(sport)) odds.refreshAll();
        else odds.refreshForSport(sport);
    }

    @PostMapping("/sync-scores")
    public void syncScores() {
        scoreSync.syncScores();
    }

    @PostMapping("/finalize")
    public void finalizeGame(@RequestParam UUID gameId,
                             @RequestParam int home,
                             @RequestParam int away) {
        settlement.setFinalScore(gameId, home, away);
    }
    @PostMapping("/api/admin/scores/refresh")
    public void refreshScores(@RequestParam(defaultValue = "all") String sport) {
        if ("all".equalsIgnoreCase(sport)) {
            scoreSyncService.refreshScoresAll();
        } else {
            scoreSyncService.refreshScoresForSport(sport);
        }
    }

}
