ALTER TABLE games
  ADD COLUMN IF NOT EXISTS home_score integer,
  ADD COLUMN IF NOT EXISTS away_score integer,
  ADD COLUMN IF NOT EXISTS is_final boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS final_at timestamptz null;
