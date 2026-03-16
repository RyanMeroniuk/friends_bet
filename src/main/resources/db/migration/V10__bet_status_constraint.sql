ALTER TABLE bets ADD CONSTRAINT chk_bet_status
    CHECK (status IN ('OPEN', 'ACCEPTED', 'RESOLVED', 'VOID'));
