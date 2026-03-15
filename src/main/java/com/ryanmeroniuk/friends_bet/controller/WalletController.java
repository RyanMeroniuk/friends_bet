package com.ryanmeroniuk.friends_bet.controller;

import com.ryanmeroniuk.friends_bet.dto.WalletDepositRequest;
import com.ryanmeroniuk.friends_bet.dto.WalletResponse;
import com.ryanmeroniuk.friends_bet.repository.UserRepository;
import com.ryanmeroniuk.friends_bet.service.WalletService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/groups/{groupId}/wallets")
public class WalletController {
    private final WalletService walletService;
    private final UserRepository userRepo;

    public WalletController(WalletService walletService, UserRepository userRepo) {
        this.walletService = walletService;
        this.userRepo = userRepo;
    }

    /** POST /api/groups/{groupId}/wallets/deposit */
    @PostMapping("/deposit")
    public ResponseEntity<WalletResponse> deposit(
            @PathVariable UUID groupId,
            @Valid @RequestBody WalletDepositRequest req
    ) {
        // Override userId with authenticated user to prevent IDOR
        UUID authUserId = currentUserId();
        req.setUserId(authUserId);
        WalletResponse resp = walletService.deposit(groupId, req);
        return ResponseEntity.ok(resp);
    }

    /** GET /api/groups/{groupId}/wallets */
    @GetMapping
    public List<WalletResponse> listBalances(
            @PathVariable UUID groupId
    ) {
        return walletService.listBalances(groupId);
    }

    private UUID currentUserId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByUsername(username)
                .map(u -> u.getId())
                .orElseThrow(() -> new IllegalArgumentException("Auth user not found"));
    }
}
