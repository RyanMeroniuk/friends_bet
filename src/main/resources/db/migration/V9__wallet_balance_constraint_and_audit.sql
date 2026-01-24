-- Add CHECK constraint to prevent negative balances at the database level
-- This is a safety net in addition to application-level validation
ALTER TABLE wallets
    ADD CONSTRAINT chk_balance_non_negative CHECK (balance_cents >= 0);

-- Create wallet_transactions audit table to log all debits/credits
CREATE TABLE wallet_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id       UUID        NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    amount_cents    BIGINT      NOT NULL,
    balance_before  BIGINT      NOT NULL,
    balance_after   BIGINT      NOT NULL,
    transaction_type VARCHAR(32) NOT NULL,
    reference_type  VARCHAR(32),
    reference_id    UUID,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- Index for querying transactions by wallet
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);

-- Index for querying by reference (e.g., find all transactions for a bet)
CREATE INDEX idx_wallet_transactions_reference ON wallet_transactions(reference_type, reference_id);

-- Index for time-based queries
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at);

COMMENT ON TABLE wallet_transactions IS 'Audit log of all wallet balance changes';
COMMENT ON COLUMN wallet_transactions.transaction_type IS 'Type: DEPOSIT, WITHDRAWAL, BET_PROPOSE, BET_ACCEPT, BET_WIN, BET_REFUND';
COMMENT ON COLUMN wallet_transactions.reference_type IS 'Entity type: BET, ADMIN_ACTION, etc.';
COMMENT ON COLUMN wallet_transactions.reference_id IS 'ID of the related entity (e.g., bet_id)';
