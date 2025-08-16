-- Backfill any nulls to 0, then enforce NOT NULL
UPDATE bets SET acceptor_stake_cents = 0 WHERE acceptor_stake_cents IS NULL;
ALTER TABLE bets ALTER COLUMN acceptor_stake_cents SET NOT NULL;
