package com.ryanmeroniuk.friends_bet.dto;

import com.ryanmeroniuk.friends_bet.model.Bet;

import java.util.List;

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
                b.getAcceptorStakeCents(),
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
}
