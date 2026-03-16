package com.ryanmeroniuk.friends_bet.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "wallet_transactions")
public class WalletTransaction {

    @Id @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "wallet_id", nullable = false)
    private Wallet wallet;

    @Column(nullable = false)
    private long amountCents;

    @Column(nullable = false)
    private long balanceBefore;

    @Column(nullable = false)
    private long balanceAfter;

    @Column(nullable = false, length = 32)
    private String transactionType;

    @Column(length = 32)
    private String referenceType;

    private UUID referenceId;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public WalletTransaction() {}

    public WalletTransaction(Wallet wallet, long amountCents, long balanceBefore,
                             long balanceAfter, String transactionType) {
        this.wallet = wallet;
        this.amountCents = amountCents;
        this.balanceBefore = balanceBefore;
        this.balanceAfter = balanceAfter;
        this.transactionType = transactionType;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public Wallet getWallet() { return wallet; }
    public long getAmountCents() { return amountCents; }
    public long getBalanceBefore() { return balanceBefore; }
    public long getBalanceAfter() { return balanceAfter; }
    public String getTransactionType() { return transactionType; }
    public String getReferenceType() { return referenceType; }
    public UUID getReferenceId() { return referenceId; }
    public Instant getCreatedAt() { return createdAt; }

    public void setReferenceType(String referenceType) { this.referenceType = referenceType; }
    public void setReferenceId(UUID referenceId) { this.referenceId = referenceId; }
}
