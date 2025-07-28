package com.ryanmeroniuk.friends_bet.dto;

import java.util.UUID;

public class AcceptBetRequest {
    private UUID acceptorId;

    public AcceptBetRequest() {}

    public UUID getAcceptorId() { return acceptorId; }
    public void setAcceptorId(UUID acceptorId) { this.acceptorId = acceptorId; }
}
