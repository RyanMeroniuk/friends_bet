package com.ryanmeroniuk.friends_bet.controller;

import com.ryanmeroniuk.friends_bet.dto.WalletDepositRequest;
import com.ryanmeroniuk.friends_bet.dto.WalletResponse;
import com.ryanmeroniuk.friends_bet.service.WalletService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/groups/{groupId}/wallets")
public class WalletController {
    private final WalletService walletService;
    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    /** POST /api/groups/{groupId}/wallets/deposit */
    @PostMapping("/deposit")
    public ResponseEntity<WalletResponse> deposit(
            @PathVariable UUID groupId,
            @RequestBody WalletDepositRequest req
    ) {
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
}
