package com.ryanmeroniuk.friends_bet.controller;

import com.ryanmeroniuk.friends_bet.model.Game;
import com.ryanmeroniuk.friends_bet.model.OddsQuote;
import com.ryanmeroniuk.friends_bet.repository.GameRepository;
import com.ryanmeroniuk.friends_bet.repository.OddsQuoteRepository;
import com.ryanmeroniuk.friends_bet.service.OddsService;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;
import java.util.UUID;

@RestController
@RequestMapping("/api/odds")
public class OddsController {

    private final GameRepository gameRepo;
    private final OddsQuoteRepository quoteRepo;
    private final OddsService oddsService;

    public OddsController(GameRepository gameRepo,
                          OddsQuoteRepository quoteRepo,
                          OddsService oddsService) {
        this.gameRepo = gameRepo;
        this.quoteRepo = quoteRepo;
        this.oddsService = oddsService;
    }

    /** Manual refresh: /api/odds/refresh?sport=basketball_nba */
    @PostMapping("/refresh")
    public Map<String,String> refresh(@RequestParam String sport) {
        oddsService.refreshForSport(sport);
        return Map.of("status","ok","sport",sport);
    }

    /** List upcoming games (simple DTO) */
    @GetMapping("/games")
    public List<Map<String,Object>> listGames() {
        return gameRepo.findAll().stream()
                .sorted(Comparator.comparing(Game::getStartTime))
                .map(g -> Map.<String,Object>of(
                        "id", g.getId(),
                        "externalGameId", g.getExternalGameId(),
                        "homeTeam", g.getHomeTeam(),
                        "awayTeam", g.getAwayTeam(),
                        "startTime", g.getStartTime()
                ))
                .collect(Collectors.toList());
    }

    /** Latest odds for a game, grouped by market */
    @GetMapping("/games/{gameId}/quotes")
    public Map<String, List<Map<String, Object>>> quotes(@PathVariable UUID gameId) {
        // Repo method should return newest first (see note below)
        List<OddsQuote> recent = quoteRepo.findTop200ByGameIdOrderByQuotedAtDesc(gameId);

        // Keep newest per (marketType, pick)
        Map<String, OddsQuote> newestByMarketPick = new LinkedHashMap<>();
        for (OddsQuote q : recent) {
            String key = q.getMarketType() + "|" + q.getPick();
            newestByMarketPick.putIfAbsent(key, q);
        }

        // Group by market -> list of quote maps
        return newestByMarketPick.values().stream()
                .collect(Collectors.groupingBy(
                        OddsQuote::getMarketType,
                        Collectors.mapping(q -> {
                            Map<String, Object> row = new LinkedHashMap<>();
                            row.put("quotedAt", q.getQuotedAt());
                            row.put("pick",     q.getPick());   // HOME/AWAY/OVER/UNDER/etc
                            row.put("odds",     q.getOdds());   // decimal odds

                            Object line = extractLine(q.getDetails());
                            if (line != null) row.put("line", line);

                            if (q.getSource() != null)   row.put("source", q.getSource());
                            if (q.getProvider() != null) row.put("provider", q.getProvider());
                            if (q.getCutoffTime() != null) row.put("cutoffTime", q.getCutoffTime());
                            return row;
                        }, Collectors.toList())
                ));
    }

    /** Pull a usable "line" from details jsonb for SPREAD/TOTALS/props, if present. */
    private Object extractLine(Map<String, Object> details) {
        if (details == null) return null;
        if (details.get("spreadPoints") != null) return details.get("spreadPoints"); // SPREAD
        if (details.get("totalLine")   != null) return details.get("totalLine");     // TOTALS
        if (details.get("line")        != null) return details.get("line");          // props / generic
        return null;
    }

}
