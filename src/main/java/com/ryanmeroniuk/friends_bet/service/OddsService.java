package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.model.Game;
import com.ryanmeroniuk.friends_bet.model.OddsQuote;
import com.ryanmeroniuk.friends_bet.odds.TheOddsApiClient;
import com.ryanmeroniuk.friends_bet.repository.GameRepository;
import com.ryanmeroniuk.friends_bet.repository.OddsQuoteRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class OddsService {

    private final TheOddsApiClient client;
    private final GameRepository gameRepo;
    private final OddsQuoteRepository quoteRepo;

    @Value("${odds.source:theoddsapi}")
    private String source;

    @Value("${odds.sport.nba:basketball_nba}")
    private String nbaSportKey;

    public OddsService(TheOddsApiClient client,
                       GameRepository gameRepo,
                       OddsQuoteRepository quoteRepo) {
        this.client = client;
        this.gameRepo = gameRepo;
        this.quoteRepo = quoteRepo;
    }

    /** Manual trigger to refresh a sport key (e.g., NBA). */
    @Transactional
    public void refreshForSport(String sportKey) {
        var events = client.fetchOdds(sportKey).block();
        if (events == null) return;

        for (var ev : events) {
            // Upsert game using externalGameId = event.id
            Game game = gameRepo.findByExternalGameId(ev.id).orElseGet(Game::new);
            if (game.getId() == null) {
                game.setExternalGameId(ev.id);
            }
            game.setHomeTeam(ev.home_team);
            game.setAwayTeam(ev.away_team);
            game.setStartTime(TheOddsApiClient.parseInstant(ev.commence_time));
            game.setSport(sportKey);
            Game saved = gameRepo.save(game);

            // MVP: take the first bookmaker
            if (ev.bookmakers == null || ev.bookmakers.isEmpty()) continue;
            var bm = ev.bookmakers.get(0);
            String provider = bm.key != null ? bm.key : bm.title; // store some provider identifier

            if (bm.markets != null) {
                for (var mkt : bm.markets) {
                    switch (mkt.key) {
                        case "h2h"     -> saveH2H(saved.getId(), provider, mkt);
                        case "spreads" -> saveSpread(saved.getId(), provider, mkt);
                        case "totals"  -> saveTotals(saved.getId(), provider, mkt);
                        default -> { /* ignore others for now */ }
                    }
                }
            }
        }
    }

    /** Periodic NBA pull (adjust or add more leagues as needed). */
    @Scheduled(fixedDelayString = "${odds.refreshMillis:180000}")
    public void scheduledNbaRefresh() {
        refreshForSport(nbaSportKey);
    }

    /* ===================== Helpers ===================== */

    /** Normalize outcome name to our canonical picks. */
    private String normalizePick(String name) {
        if (name == null) return null;
        String n = name.trim().toUpperCase(Locale.ROOT);
        return switch (n) {
            case "HOME"  -> "HOME";
            case "AWAY"  -> "AWAY";
            case "OVER"  -> "OVER";
            case "UNDER" -> "UNDER";
            default -> null; // unknown label; skip
        };
    }

    private void persistQuote(UUID gameId,
                              String provider,
                              String marketType,
                              String pick,
                              Double price,
                              Map<String, Object> details) {
        if (pick == null || price == null) return;

        OddsQuote q = new OddsQuote();
        q.setGameId(gameId);
        q.setMarketType(marketType);       // WINNER / SPREAD / TOTALS
        q.setPick(pick);                   // HOME / AWAY / OVER / UNDER
        q.setOdds(price);                  // decimal odds
        q.setDetails(details == null ? Map.of() : details);
        q.setSource(source);               // e.g., "theoddsapi"
        q.setProvider(provider);           // e.g., bookmaker key/title
        q.setQuotedAt(Instant.now());
        quoteRepo.save(q);
    }

    private void saveH2H(UUID gameId, String provider, TheOddsApiClient.Market market) {
        if (market == null || market.outcomes == null) return;

        for (var o : market.outcomes) {
            String pick = normalizePick(o.name); // expect HOME / AWAY
            if (!"HOME".equals(pick) && !"AWAY".equals(pick)) continue;
            persistQuote(gameId, provider, "WINNER", pick, o.price, Map.of());
        }
    }

    private void saveSpread(UUID gameId, String provider, TheOddsApiClient.Market market) {
        if (market == null || market.outcomes == null) return;

        for (var o : market.outcomes) {
            String pick = normalizePick(o.name); // expect HOME / AWAY
            if (!"HOME".equals(pick) && !"AWAY".equals(pick)) continue;

            Map<String, Object> details = new HashMap<>();
            if (o.point != null) details.put("spreadPoints", o.point);

            persistQuote(gameId, provider, "SPREAD", pick, o.price, details);
        }
    }

    private void saveTotals(UUID gameId, String provider, TheOddsApiClient.Market market) {
        if (market == null || market.outcomes == null) return;

        // Totals usually share the same line (point) for Over/Under
        Double sharedLine = null;
        for (var o : market.outcomes) {
            if (o.point != null) { sharedLine = o.point; break; }
        }

        for (var o : market.outcomes) {
            String pick = normalizePick(o.name); // OVER / UNDER
            if (!"OVER".equals(pick) && !"UNDER".equals(pick)) continue;

            Double line = sharedLine != null ? sharedLine : o.point;
            Map<String, Object> details = (line != null)
                    ? Map.of("totalLine", line)
                    : Map.of();

            persistQuote(gameId, provider, "TOTALS", pick, o.price, details);
        }
    }
}
