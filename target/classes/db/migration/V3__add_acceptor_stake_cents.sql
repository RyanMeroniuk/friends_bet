-- Adds the acceptor's stake column for P2P staking (nullable until a bet is accepted)
ALTER TABLE bets
  ADD COLUMN IF NOT EXISTS acceptor_stake_cents BIGINT;

-- Optional backfill so old rows won’t be null if you prefer:
-- UPDATE bets SET acceptor_stake_cents = amount_cents WHERE acceptor_stake_cents IS NULL;
