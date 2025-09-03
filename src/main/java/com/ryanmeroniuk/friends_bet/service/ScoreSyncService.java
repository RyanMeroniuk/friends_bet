package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.model.Game;
import com.ryanmeroniuk.friends_bet.odds.TheOddsApiClient;
import com.ryanmeroniuk.friends_bet.repository.GameRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class ScoreSyncService {

    private final TheOddsApiClient client;
    private final GameRepository gameRepo;
    private final SettlementService settlement;

    @Value("${odds.sportKeys:}")
    private String configuredSportKeys;

    /** how many past days of fixtures to check for finals */
    @Value("${scores.daysFrom:3}")
    private int daysFrom;

    public ScoreSyncService(TheOddsApiClient client,
                            GameRepository gameRepo,
                            SettlementService settlement) {
        this.client = client;
        this.gameRepo = gameRepo;
        this.settlement = settlement;
    }

    /* ---------- Public API so an admin endpoint can call these ---------- */

    @Transactional
    public void refreshScoresAll() {
        for (String sport : sportKeys()) {
            try {
                refreshScoresForSport(sport);
            } catch (Exception e) {
                System.err.println("[scores] sync failed for " + sport + " : " + e.getMessage());
            }
        }
    }

    @Transactional
    public void refreshScoresForSport(String sport) {
        var events = client.fetchScores(sport, daysFrom).block();
        if (events == null || events.isEmpty()) return;

        for (var ev : events) {
            if (ev.completed == null || !ev.completed) continue;

            var optGame = gameRepo.findByExternalGameId(ev.id);
            if (optGame.isEmpty()) continue;

            Game g = optGame.get();
            if (g.isFinal()) continue;

            Integer homeScore = null, awayScore = null;

            if (ev.scores != null) {
                for (var s : ev.scores) {
                    if (s == null || s.name == null) continue;
                    String name = s.name.trim();

                    // Prefer matching against our stored Game names,
                    // but also accept the event’s home_team/away_team fields.
                    if (sameTeam(name, g.getHomeTeam()) || sameTeam(name, ev.home_team)) {
                        homeScore = s.score;
                    }
                    if (sameTeam(name, g.getAwayTeam()) || sameTeam(name, ev.away_team)) {
                        awayScore = s.score;
                    }
                }
            }

            // Only finalize & settle when both scores are known
            if (homeScore != null && awayScore != null) {
                settlement.setFinalScore(g.getId(), homeScore, awayScore);
            }
        }
    }

    private List<String> sportKeys() {
        if (configuredSportKeys == null || configuredSportKeys.isBlank()) return List.of();
        String[] parts = configuredSportKeys.split(",");
        List<String> out = new ArrayList<>(parts.length);
        for (String p : parts) {
            String s = p.trim();
            if (!s.isEmpty()) out.add(s);
        }
        return out;
    }

    private static boolean sameTeam(String a, String b) {
        return a != null && b != null && a.trim().equalsIgnoreCase(b.trim());
    }
}
