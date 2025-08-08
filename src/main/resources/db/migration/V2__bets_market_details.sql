-- Core columns for multi-market bets
ALTER TABLE bets
  ADD COLUMN IF NOT EXISTS market_type VARCHAR(40) NOT NULL DEFAULT 'WINNER',
  ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS quoted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source VARCHAR(40),
  ADD COLUMN IF NOT EXISTS cutoff_time TIMESTAMPTZ;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_bets_group     ON bets(group_id);
CREATE INDEX IF NOT EXISTS idx_bets_game      ON bets(game_id);
CREATE INDEX IF NOT EXISTS idx_bets_type      ON bets(market_type);
CREATE INDEX IF NOT EXISTS idx_bets_details_gin ON bets USING GIN(details);

-- Optional: drop defaults so future inserts must set values explicitly
ALTER TABLE bets ALTER COLUMN market_type DROP DEFAULT;
ALTER TABLE bets ALTER COLUMN details DROP DEFAULT;
