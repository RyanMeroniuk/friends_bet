package com.ryanmeroniuk.friends_bet.odds;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import java.time.Instant;
import java.util.List;

@Component
public class TheOddsApiClient {
    private final WebClient web;

    @Value("${odds.apiKey}")
    private String apiKey;
    @Value("${odds.regions:us}")
    private String regions;
    @Value("${odds.markets:h2h,spreads,totals}")
    private String markets;

    public TheOddsApiClient() {
        this.web = WebClient.builder()
                .baseUrl("https://api.the-odds-api.com/v4")
                .build();
    }

    public Mono<List<Event>> fetchOdds(String sportKey) {
        return web.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/sports/{sport}/odds")
                        .queryParam("regions", regions)
                        .queryParam("markets", markets)
                        .queryParam("oddsFormat", "decimal")
                        .queryParam("apiKey", apiKey)
                        .build(sportKey))
                .retrieve()
                .onStatus(HttpStatusCode::isError, resp -> resp.bodyToMono(String.class)
                        .map(msg -> new RuntimeException("Odds API error: " + msg)))
                .bodyToFlux(Event.class)
                .collectList();
    }

    // --- DTOs (shaped to The Odds API) ---
    public static class Event {
        public String id;            // external event id
        public String home_team;
        public String away_team;
        public String sport_key;
        public String sport_title;
        public String commence_time; // ISO
        public List<Bookmaker> bookmakers;
    }

    public static class Bookmaker {
        public String key;
        public String title;
        public String last_update;
        public List<Market> markets;
    }

    public static class Market {
        public String key; // "h2h" | "spreads" | "totals"
        public List<Outcome> outcomes;
    }

    public static class Outcome {
        public String name;   // "HOME"/"AWAY" or "Over"/"Under" or team name
        public Double price;  // decimal odds
        public Double point;  // spread/totals line (nullable)
    }

    public static Instant parseInstant(String iso) {
        return Instant.parse(iso);
    }
}
