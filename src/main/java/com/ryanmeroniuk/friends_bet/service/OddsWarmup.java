package com.ryanmeroniuk.friends_bet.service;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class OddsWarmup {
    private final OddsService odds;

    public OddsWarmup(OddsService odds) {
        this.odds = odds;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        odds.refreshAll();   // pulls whatever is in odds.sportKeys (or NBA fallback)
    }
}
