-- Add a nullable 'sport' column to tag games by league/sport key (e.g., 'basketball_nba')
ALTER TABLE games
ADD COLUMN IF NOT EXISTS sport TEXT;
