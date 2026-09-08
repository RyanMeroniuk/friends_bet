package com.ryanmeroniuk.friends_bet.controller;

import com.ryanmeroniuk.friends_bet.dto.GameDto;
import com.ryanmeroniuk.friends_bet.model.Game;
import com.ryanmeroniuk.friends_bet.repository.GameRepository;
import com.ryanmeroniuk.friends_bet.repository.OddsQuoteRepository;
import com.ryanmeroniuk.friends_bet.service.OddsService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class GamesController {

    private static final long REFRESH_COOLDOWN_MS = 60_000; // 1 minute per user
    private final ConcurrentHashMap<String, Instant> userRefreshCooldowns = new ConcurrentHashMap<>();

    private final GameRepository gameRepo;
    private final OddsQuoteRepository quoteRepo;
    private final OddsService oddsService;
    private final String configuredSportKeys;

    public GamesController(GameRepository gameRepo,
                           OddsQuoteRepository quoteRepo,
                           OddsService oddsService,
                           @Value("${odds.sportKeys:}") String configuredSportKeys) {
        this.gameRepo = gameRepo;
        this.quoteRepo = quoteRepo;
        this.oddsService = oddsService;
        this.configuredSportKeys = configuredSportKeys;
    }

    /** 1) Sports with upcoming games in the next {days} (default 2) */
    @GetMapping("/sports")
    public List<String> upcomingSports(@RequestParam(name = "days", defaultValue = "2") int days) {
        Instant now = Instant.now();
        Instant to = now.plus(days, ChronoUnit.DAYS);
        List<String> dbSports = gameRepo.findDistinctSportsWithGamesBetween(now, to);

        // Fall back to configured sportKeys so UI can show options even before games exist.
        Set<String> merged = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        merged.addAll(dbSports);
        merged.addAll(parseConfiguredSports());

        return merged.stream()
                .map(String::valueOf)
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
    }

    /** 2) Games for a given sport in the next {days} (default 2), sorted by start time */
    @GetMapping("/sports/{sport}/games")
    public List<GameDto> gamesForSport(
            @PathVariable String sport,
            @RequestParam(name = "days", defaultValue = "2") int days
    ) {
        Instant now = Instant.now();
        Instant to = now.plus(days, ChronoUnit.DAYS);
        return gameRepo.findBySportAndStartTimeBetweenOrderByStartTimeAsc(sport, now, to)
                .stream().map(GamesController::toDto).toList();
    }

    /** 3) All upcoming games grouped by sport for the next {days} (default 2) */
    @GetMapping("/games/upcoming")
    public Map<String, List<GameDto>> upcomingGamesGrouped(
            @RequestParam(name = "days", defaultValue = "2") int days
    ) {
        Instant now = Instant.now();
        Instant to = now.plus(days, ChronoUnit.DAYS);

        List<Game> games = gameRepo.findByStartTimeBetweenOrderByStartTimeAsc(now, to);

        // Sort by sport (nulls last) then start time for deterministic output
        var sorted = games.stream()
                .sorted(Comparator
                        .comparing((Game g) -> Optional.ofNullable(g.getSport()).orElse("\uFFFF"))
                        .thenComparing(Game::getStartTime))
                .map(GamesController::toDto)
                .toList();

        return sorted.stream()
                .collect(Collectors.groupingBy(
                        g -> Optional.ofNullable(g.sport()).orElse("unknown"),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));
    }

    /** 4) Available bet types (markets) for a game, e.g., ["WINNER","SPREAD","TOTALS"] */
    @GetMapping("/games/{gameId}/markets")
    public List<String> marketsForGame(@PathVariable UUID gameId) {
        return quoteRepo.findDistinctMarketTypesByGameId(gameId);
    }

    private static GameDto toDto(Game g) {
        return new GameDto(g.getId(), g.getSport(), g.getStartTime(), g.getHomeTeam(), g.getAwayTeam());
    }

    /** User-facing endpoint to refresh odds/games from external API. Rate-limited per user. */
    @PostMapping("/games/refresh")
    public ResponseEntity<Map<String, Object>> refreshGames(
            @RequestParam(defaultValue = "all") String sport) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Instant lastRefresh = userRefreshCooldowns.get(username);
        if (lastRefresh != null && Instant.now().toEpochMilli() - lastRefresh.toEpochMilli() < REFRESH_COOLDOWN_MS) {
            long waitSecs = (REFRESH_COOLDOWN_MS - (Instant.now().toEpochMilli() - lastRefresh.toEpochMilli())) / 1000;
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Please wait " + waitSecs + "s before refreshing again"));
        }
        userRefreshCooldowns.put(username, Instant.now());

        if ("all".equalsIgnoreCase(sport)) {
            oddsService.refreshAll();
        } else {
            oddsService.refreshForSport(sport);
        }
        return ResponseEntity.ok(Map.of("status", "ok", "refreshed", sport));
    }

    private List<String> parseConfiguredSports() {
        if (configuredSportKeys == null || configuredSportKeys.isBlank()) return List.of();
        String[] parts = configuredSportKeys.split(",");
        List<String> out = new ArrayList<>(parts.length);
        for (String p : parts) {
            String s = p.trim();
            if (!s.isEmpty()) out.add(s);
        }
        return out;
    }
}
