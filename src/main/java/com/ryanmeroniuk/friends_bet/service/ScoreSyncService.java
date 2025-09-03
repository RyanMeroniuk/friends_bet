package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.model.Game;
import com.ryanmeroniuk.friends_bet.odds.TheOddsApiClient;
import com.ryanmeroniuk.friends_bet.repository.GameRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class ScoreSyncService {

    private final TheOddsApiClient client;
    private final GameRepository gameRepo;
    private final SettlementService settlement;

    @Value("${odds.sportKeys:}")
    private String configuredSportKeys;

    /** default how many past days of fixtures to check for finals */
    @Value("${scores.daysFrom:3}")
    private int defaultDaysFrom;

    public ScoreSyncService(TheOddsApiClient client,
                            GameRepository gameRepo,
                            SettlementService settlement) {
        this.client = client;
        this.gameRepo = gameRepo;
        this.settlement = settlement;
    }

    /* =========================================================
       Summary DTOs
       ========================================================= */
    public static class ScoreSyncSummary {
        public int sportsVisited;
        public int eventsChecked;
        public int completedEventsSeen;
        public int gamesMatched;
        public int gamesAlreadyFinal;
        public int gamesFinalized;      // newly finalized in this run
        public int betsSettled;         // total bets settled across all games
        public List<PerSport> perSport = new ArrayList<>();
    }

    public static class PerSport {
        public String sport;
        public int eventsChecked;
        public int completedEventsSeen;
        public int gamesMatched;
        public int gamesAlreadyFinal;
        public int gamesFinalized;
        public int betsSettled;
        public List<String> errors = new ArrayList<>();
    }

    /* =========================================================
       Public API — called by admin endpoint
       ========================================================= */

    /**
     * Refresh scores for either a single sport or "all".
     * @param sportOrAll e.g. "baseball_mlb" or "all"
     * @param daysFromOverride optional override for how many past days to scan
     */
    public ScoreSyncSummary refreshScores(String sportOrAll, Integer daysFromOverride) {
        int daysFrom = (daysFromOverride != null && daysFromOverride > 0)
                ? daysFromOverride
                : defaultDaysFrom;

        List<String> keys = "all".equalsIgnoreCase(nullToEmpty(sportOrAll))
                ? sportKeys()
                : List.of(sportOrAll);

        ScoreSyncSummary total = new ScoreSyncSummary();
        total.sportsVisited = keys.size();

        for (String sport : keys) {
            PerSport ps = processSport(sport, daysFrom);
            total.perSport.add(ps);
            total.eventsChecked       += ps.eventsChecked;
            total.completedEventsSeen += ps.completedEventsSeen;
            total.gamesMatched        += ps.gamesMatched;
            total.gamesAlreadyFinal   += ps.gamesAlreadyFinal;
            total.gamesFinalized      += ps.gamesFinalized;
            total.betsSettled         += ps.betsSettled;
        }
        return total;
    }

    /* =========================================================
       Internal
       ========================================================= */

    private PerSport processSport(String sport, int daysFrom) {
        PerSport ps = new PerSport();
        ps.sport = sport;

        try {
            var events = client.fetchScores(sport, daysFrom).block();
            if (events == null || events.isEmpty()) return ps;

            ps.eventsChecked = events.size();

            for (var ev : events) {
                if (ev.completed != null && ev.completed) {
                    ps.completedEventsSeen++;
                } else {
                    continue; // only care about completed events
                }

                var optGame = gameRepo.findByExternalGameId(ev.id);
                if (optGame.isEmpty()) continue;
                ps.gamesMatched++;

                Game g = optGame.get();
                if (g.isFinal()) { ps.gamesAlreadyFinal++; continue; }

                Integer homeScore = null, awayScore = null;
                if (ev.scores != null) {
                    for (var s : ev.scores) {
                        if (s == null || s.name == null) continue;
                        String name = s.name.trim();
                        if (sameTeam(name, g.getHomeTeam()) || sameTeam(name, ev.home_team)) {
                            homeScore = s.score;
                        }
                        if (sameTeam(name, g.getAwayTeam()) || sameTeam(name, ev.away_team)) {
                            awayScore = s.score;
                        }
                    }
                }

                if (homeScore != null && awayScore != null) {
                    // Mark final & settle
                    int settled = settlement.setFinalScore(g.getId(), homeScore, awayScore);
                    ps.gamesFinalized++;
                    ps.betsSettled += settled;
                } else {
                    // If the provider marked completed but didn’t return scores,
                    // you may decide to force-finalize. We’ll skip by default.
                    // Example (opt-in):
                    // g.setFinal(true);
                    // g.setFinalAt(Instant.now());
                    // gameRepo.save(g);
                    // ps.gamesFinalized++;
                    // ps.betsSettled += settlement.settleGame(g.getId());
                }
            }
        } catch (Exception e) {
            ps.errors.add(e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage());
        }

        return ps;
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

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}
