package com.ryanmeroniuk.friends_bet.controller;

import com.ryanmeroniuk.friends_bet.dto.AcceptBetRequest;
import com.ryanmeroniuk.friends_bet.dto.BetResponse;
import com.ryanmeroniuk.friends_bet.dto.CreateBetRequest;
import com.ryanmeroniuk.friends_bet.service.BetService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class BetController {
    private final BetService betService;

    public BetController(BetService betService) {
        this.betService = betService;
    }

    /**
     * Propose a new bet in a group.
     * POST /api/groups/{groupId}/bets
     */
    @PostMapping(
            value = "/groups/{groupId}/bets",
            consumes = "application/json",
            produces = "application/json"
    )
    public ResponseEntity<BetResponse> proposeBet(
            @PathVariable UUID groupId,
            @Valid @RequestBody CreateBetRequest req
    ) {
        // Defensive: if the body also contains groupId, ensure it matches the path
        if (req.getGroupId() != null && !groupId.equals(req.getGroupId())) {
            return ResponseEntity.badRequest().body(null);
        }
        req.setGroupId(groupId);

        BetResponse resp = betService.propose(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    /**
     * List all bets in a group.
     * GET /api/groups/{groupId}/bets
     */
    @GetMapping(
            value = "/groups/{groupId}/bets",
            produces = "application/json"
    )
    public List<BetResponse> listBets(@PathVariable UUID groupId) {
        return betService.listByGroup(groupId);
    }

    /**
     * Accept an existing open bet.
     * POST /api/bets/{betId}/accept
     */
    @PostMapping(
            value = "/bets/{betId}/accept",
            consumes = "application/json",
            produces = "application/json"
    )
    public ResponseEntity<BetResponse> acceptBet(
            @PathVariable UUID betId,
            @Valid @RequestBody AcceptBetRequest req
    ) {
        BetResponse resp = betService.accept(betId, req);
        return ResponseEntity.ok(resp);
    }

    /**
     * Handle invalid arguments (e.g. not found, already accepted).
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }
}
