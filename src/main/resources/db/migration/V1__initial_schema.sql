-- V1: Complete initial schema for BigStu Bets

CREATE TABLE IF NOT EXISTS users (
    id uuid NOT NULL PRIMARY KEY,
    created_at timestamp(6) with time zone NOT NULL,
    email character varying(255) NOT NULL UNIQUE,
    password_hash character varying(255) NOT NULL,
    username character varying(255) NOT NULL UNIQUE,
    failed_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone
);

CREATE TABLE IF NOT EXISTS groups (
    id uuid NOT NULL PRIMARY KEY,
    created_at timestamp(6) with time zone NOT NULL,
    invite_code character varying(255) NOT NULL UNIQUE,
    name character varying(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS group_members (
    id uuid NOT NULL PRIMARY KEY,
    joined_at timestamp(6) with time zone NOT NULL,
    group_id uuid NOT NULL REFERENCES groups(id),
    user_id uuid NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS games (
    id uuid NOT NULL PRIMARY KEY,
    away_team character varying(255) NOT NULL,
    external_game_id character varying(255) NOT NULL UNIQUE,
    home_team character varying(255) NOT NULL,
    start_time timestamp(6) with time zone NOT NULL,
    sport text,
    home_score integer,
    away_score integer,
    is_final boolean DEFAULT false NOT NULL,
    final_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS bets (
    id uuid NOT NULL PRIMARY KEY,
    amount_cents bigint NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    market_type character varying(255) NOT NULL,
    odds double precision NOT NULL,
    pick character varying(255) NOT NULL,
    resolved_at timestamp(6) with time zone,
    status character varying(255) NOT NULL,
    acceptor_id uuid REFERENCES users(id),
    game_id uuid NOT NULL REFERENCES games(id),
    group_id uuid NOT NULL REFERENCES groups(id),
    proposer_id uuid NOT NULL REFERENCES users(id),
    details jsonb NOT NULL DEFAULT '{}',
    quoted_at timestamp with time zone,
    source character varying(40),
    cutoff_time timestamp with time zone,
    acceptor_stake_cents bigint NOT NULL DEFAULT 0,
    CONSTRAINT chk_bet_status CHECK (status IN ('OPEN', 'ACCEPTED', 'RESOLVED', 'VOID'))
);

CREATE TABLE IF NOT EXISTS wallets (
    id uuid NOT NULL PRIMARY KEY,
    balance_cents bigint NOT NULL DEFAULT 0,
    group_id uuid NOT NULL REFERENCES groups(id),
    user_id uuid NOT NULL REFERENCES users(id),
    UNIQUE (group_id, user_id),
    CONSTRAINT chk_balance_non_negative CHECK (balance_cents >= 0)
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    amount_cents bigint NOT NULL,
    balance_before bigint NOT NULL,
    balance_after bigint NOT NULL,
    transaction_type character varying(32) NOT NULL,
    reference_type character varying(32),
    reference_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS odds_quotes (
    id uuid NOT NULL PRIMARY KEY,
    game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    market_type text NOT NULL,
    pick text NOT NULL,
    odds double precision NOT NULL CHECK (odds > 1.0),
    quoted_at timestamp with time zone DEFAULT now() NOT NULL,
    provider text,
    source text DEFAULT 'external',
    cutoff_time timestamp with time zone,
    details jsonb DEFAULT '{}' NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    jti character varying(64) NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamp without time zone NOT NULL,
    revoked boolean DEFAULT false NOT NULL,
    revoked_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bets_game ON bets(game_id);
CREATE INDEX IF NOT EXISTS idx_bets_group ON bets(group_id);
CREATE INDEX IF NOT EXISTS idx_bets_type ON bets(market_type);
CREATE INDEX IF NOT EXISTS idx_bets_details_gin ON bets USING gin(details);
CREATE INDEX IF NOT EXISTS idx_odds_quotes_game_mkt_pick_time ON odds_quotes(game_id, market_type, pick, quoted_at DESC);
CREATE INDEX IF NOT EXISTS idx_odds_quotes_provider_time ON odds_quotes(provider, quoted_at DESC);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON wallet_transactions(reference_type, reference_id);

-- View for latest odds per game/market/pick
CREATE OR REPLACE VIEW latest_odds_quotes AS
SELECT DISTINCT ON (game_id, market_type, pick)
    id, game_id, market_type, pick, odds, quoted_at, provider, source, cutoff_time, details
FROM odds_quotes
ORDER BY game_id, market_type, pick, quoted_at DESC;
