package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.model.Game;

import java.util.Locale;

/**
 * Canonical pick values shared by bet creation and settlement.
 *
 * WINNER and SPREAD picks are stored as "HOME" or "AWAY"; TOTALS picks as "OVER" or "UNDER".
 * A team name is accepted too and mapped to its side, so older bets that stored the
 * team name still settle against the right team.
 */
final class BetPicks {

    static final String HOME = "HOME";
    static final String AWAY = "AWAY";
    static final String OVER = "OVER";
    static final String UNDER = "UNDER";

    private BetPicks() {}

    /** Returns the canonical pick for the market, or null if it can't be resolved. */
    static String canonical(String market, String rawPick, Game game) {
        String pick = rawPick == null ? "" : rawPick.trim();
        if (pick.isEmpty()) return null;
        String upper = pick.toUpperCase(Locale.ROOT);

        switch (market == null ? "" : market.toUpperCase(Locale.ROOT)) {
            case "WINNER", "SPREAD" -> {
                if (HOME.equals(upper) || AWAY.equals(upper)) return upper;
                if (game != null) {
                    if (pick.equalsIgnoreCase(nullToEmpty(game.getHomeTeam()))) return HOME;
                    if (pick.equalsIgnoreCase(nullToEmpty(game.getAwayTeam()))) return AWAY;
                }
                return null;
            }
            case "TOTALS" -> {
                return (OVER.equals(upper) || UNDER.equals(upper)) ? upper : null;
            }
            default -> {
                return null;
            }
        }
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s.trim();
    }
}
