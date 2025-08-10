package com.ryanmeroniuk.friends_bet.dto;

import com.ryanmeroniuk.friends_bet.model.Bet;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class BetMapper {
    private BetMapper() {}

    public static BetResponse toResponse(Bet b) {
        return new BetResponse(
                b.getId(),
                b.getGroupId(),
                b.getGameId(),
                b.getProposerId(),
                b.getAcceptorId(),
                b.getMarketType(),
                b.getPick(),
                b.getAmountCents(),
                b.getOdds(),
                b.getStatus(),
                b.getCreatedAt(),
                b.getResolvedAt(),
                b.getDetails(),
                b.getQuotedAt(),
                b.getSource(),
                b.getCutoffTime()
        );
    }

    public static List<BetResponse> toResponse(List<Bet> bets) {
        return bets.stream().map(BetMapper::toResponse).toList();
    }

    public static Bet fromCreate(UUID groupId, CreateBetRequest req) {
        Bet b = new Bet();
        b.setGroupId(groupId);
        b.setGameId(req.getGameId());
        b.setProposerId(req.getProposerId());

        b.setMarketType(normalizeMarket(req.getMarketType()));
        b.setPick(req.getPick());
        b.setAmountCents(req.getAmountCents());
        b.setOdds(req.getOdds());

        Map<String,Object> det = (req.getDetails() != null) ? req.getDetails() : new HashMap<>();
        b.setDetails(det);

        b.setCutoffTime(req.getCutoffTime());
        b.setQuotedAt(Instant.now());
        b.setSource("internal");
        return b;
    }

    private static String normalizeMarket(String mt) {
        if (mt == null) return "WINNER";
        return switch (mt.trim().toUpperCase()) {
            case "WIN", "ML", "MONEYLINE", "WINNER" -> "WINNER";
            case "SPREAD" -> "SPREAD";
            case "TOTALS", "OU", "OVER_UNDER" -> "TOTALS";
            case "PLAYER_PROP" -> "PLAYER_PROP";
            case "TEAM_PROP" -> "TEAM_PROP";
            case "SAME_GAME", "SGP" -> "SAME_GAME";
            case "PARLAY" -> "PARLAY";
            default -> mt.trim().toUpperCase();
        };
    }
}
