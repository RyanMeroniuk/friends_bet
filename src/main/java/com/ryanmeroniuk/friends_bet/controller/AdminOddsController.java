package com.ryanmeroniuk.friends_bet.controller;

import com.ryanmeroniuk.friends_bet.service.OddsService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminOddsController {

    private final OddsService oddsService;

    public AdminOddsController(OddsService oddsService) {
        this.oddsService = oddsService;
    }

    @PostMapping("/refresh")
    public void refresh(@RequestParam String sport) {
        oddsService.refreshForSport(sport);
    }
}
