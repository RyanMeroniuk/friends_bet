CREATE TABLE IF NOT EXISTS odds_quotes (
  id               UUID PRIMARY KEY,                         -- app-generated
  game_id          UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  market_type      TEXT NOT NULL,                            -- e.g. WINNER, SPREAD, TOTALS, PLAYER_PROP, TEAM_PROP, SAME_GAME, PARLAY
  pick             TEXT NOT NULL,                            -- e.g. HOME, AWAY, or prop key
  odds             DOUBLE PRECISION NOT NULL CHECK (odds > 1.0),
  quoted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),       -- when this quote was observed
  provider         TEXT,                                     -- e.g. the-odds-api, pinnacle, etc.
  source           TEXT DEFAULT 'external',                  -- 'external' | 'internal'
  cutoff_time      TIMESTAMPTZ,                              -- optional validity limit
  details          JSONB NOT NULL DEFAULT '{}'::jsonb        -- flexible: spreads, totals, prop metadata, etc.
);


CREATE INDEX IF NOT EXISTS idx_odds_quotes_game_mkt_pick_time
  ON odds_quotes (game_id, market_type, pick, quoted_at DESC);


CREATE INDEX IF NOT EXISTS idx_odds_quotes_provider_time
  ON odds_quotes (provider, quoted_at DESC);

CREATE OR REPLACE VIEW latest_odds_quotes AS
SELECT DISTINCT ON (game_id, market_type, pick)
  id,
  game_id,
  market_type,
  pick,
  odds,
  quoted_at,
  provider,
  source,
  cutoff_time,
  details
FROM odds_quotes
ORDER BY game_id, market_type, pick, quoted_at DESC;
