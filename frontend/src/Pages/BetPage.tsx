import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Divider, Button, TextField, MenuItem } from '@mui/material';
import { listMyGroups, GroupResponse } from '../api/group';
import { listBets, acceptBet, proposeBet, Bet } from '../api/bet';
import { useGroup } from '../context/GroupContext';

const MARKET_TYPES = [
  'WINNER',
  'SPREAD',
  'TOTALS',
  'PLAYER_PROP',
  'TEAM_PROP',
  'SAME_GAME',
  'PARLAY',
];

export default function BetPage() {
  // LEFT: groups & selection (shared via context)
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const { groupId, setGroupId } = useGroup();

  // RIGHT – bets & form state
  const [bets, setBets] = useState<Bet[]>([]);
  const [loadingBets, setLoadingBets] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // propose form
  const [gameId, setGameId] = useState('');
  const [marketType, setMarketType] = useState<string>('WINNER');
  const [pick, setPick] = useState('HOME');
  const [amountCents, setAmountCents] = useState<string>('');
  const [odds, setOdds] = useState<string>('1.90');

  // current user
  const auth = JSON.parse(localStorage.getItem('authUser') || '{}');
  const currentUserId: string = auth.id;

  // load my groups
  useEffect(() => {
    (async () => {
      try {
        const mine = await listMyGroups(currentUserId);
        setGroups(mine);
        if (!groupId && mine.length > 0) setGroupId(mine[0].id);
      } catch {
        setErr('Could not load your groups');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const selected = useMemo(
    () => groups.find(g => g.id === groupId),
    [groups, groupId]
  );

  // load bets for selected group
  useEffect(() => {
    if (!selected) {
      setBets([]);
      return;
    }
    (async () => {
      try {
        setLoadingBets(true);
        setErr(null);
        const data = await listBets(selected.id);
        setBets(data);
      } catch (e: any) {
        setErr(e?.response?.data || 'Could not load bets');
      } finally {
        setLoadingBets(false);
      }
    })();
  }, [selected]);

  function selectGroup(id: string) {
    setGroupId(id);
    setMsg(null);
    setErr(null);
  }

  async function handleAccept(betId: string) {
    setMsg(null);
    setErr(null);
    try {
      await acceptBet(betId, currentUserId); // backend will also enforce auth=acceptor
      setMsg('Bet accepted!');
      // refresh
      const data = await listBets(selected!.id);
      setBets(data);
    } catch (e: any) {
      setErr(e?.response?.data || 'Error accepting bet');
    }
  }

  async function handlePropose(e?: React.FormEvent) {
    e?.preventDefault();
    setMsg(null);
    setErr(null);

    const amt = parseInt(amountCents, 10);
    const oddsNum = parseFloat(odds);

    if (!selected) return;
    if (!gameId.trim()) return setErr('Game ID is required');
    if (isNaN(amt) || amt <= 0) return setErr('Amount (cents) must be > 0');
    if (isNaN(oddsNum) || oddsNum <= 1.0) return setErr('Odds must be > 1.0');

    try {
      await proposeBet(
        selected.id,
        currentUserId,
        gameId.trim(),
        marketType,
        pick.trim().toUpperCase(),
        amt,
        oddsNum
      );
      setMsg('Bet proposed!');
      setGameId('');
      setPick('HOME');
      setAmountCents('');
      setOdds('1.90');

      const data = await listBets(selected.id);
      setBets(data);
    } catch (e: any) {
      setErr(e?.response?.data || 'Error proposing bet');
    }
  }

  // layout styles (consistent with Groups/Wallets pages)
  const layout: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    gap: '1.25rem',
    alignItems: 'start',
  };
  const card: React.CSSProperties = {
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '1rem',
    background: '#fff',
  };
  const listItem = (active: boolean): React.CSSProperties => ({
    padding: '0.55rem 0.65rem',
    borderRadius: 6,
    cursor: 'pointer',
    background: active ? '#eef5ff' : 'transparent',
    border: active ? '1px solid #cfe3ff' : '1px solid transparent',
    marginBottom: 6,
  });
  const panel: React.CSSProperties = { ...card, marginBottom: '1rem' };

  // only show bets that aren’t settled
  const activeBets = bets.filter(
    b => b.status !== 'RESOLVED' && b.status !== 'VOID'
  );

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Bets
      </Typography>

      {err && (
        <Typography color="error" sx={{ mb: 2 }}>
          {err}
        </Typography>
      )}
      {msg && (
        <Typography color="secondary" sx={{ mb: 2 }}>
          {msg}
        </Typography>
      )}

      <div style={layout}>
        {/* LEFT: your groups */}
        <aside style={card}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Your Groups
          </Typography>
          <Divider sx={{ mb: 1 }} />
          {groups.length === 0 && <div>No groups yet.</div>}
          {groups.map(g => (
            <div
              key={g.id}
              style={listItem(g.id === groupId)}
              onClick={() => selectGroup(g.id)}
              title={`Switch to ${g.name}`}
            >
              <div style={{ fontWeight: 600 }}>{g.name}</div>
              <div style={{ fontSize: 12, color: '#666' }}>
                Code: {g.inviteCode}
              </div>
            </div>
          ))}
        </aside>

        {/* RIGHT: two stacked panels */}
        <main>
          {/* Top: Open & Accepted bets */}
          <section style={panel}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Open & Accepted Bets
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {!selected ? (
              <div>Select a group to view bets.</div>
            ) : loadingBets ? (
              <div>Loading bets…</div>
            ) : activeBets.length === 0 ? (
              <div>No active bets.</div>
            ) : (
              <div style={{ display: 'grid', rowGap: 10 }}>
                {activeBets.map(b => (
                  <div
                    key={b.id}
                    style={{
                      border: '1px solid #eee',
                      borderRadius: 6,
                      padding: '0.6rem 0.7rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <strong>{b.marketType}</strong> — pick <strong>{b.pick}</strong> @{' '}
                        <strong>{b.odds}</strong>
                        <div style={{ fontSize: 13, color: '#666' }}>
                          Amount: ${(b.amountCents / 100).toFixed(2)} • Status: {b.status}
                        </div>
                      </div>
                      {b.status === 'OPEN' && !b.acceptorId && b.proposerId !== currentUserId && (
                        <Button variant="outlined" size="small" onClick={() => handleAccept(b.id)}>
                          Accept
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Bottom: Propose new bet */}
          <section style={panel}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Propose a New Bet
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {!selected ? (
              <div>Select a group first.</div>
            ) : (
              <form
                onSubmit={handlePropose}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 12,
                }}
              >
                <TextField
                  label="Game ID"
                  value={gameId}
                  onChange={e => setGameId(e.target.value)}
                  required
                />

                <TextField
                  select
                  label="Market Type"
                  value={marketType}
                  onChange={e => setMarketType(e.target.value)}
                  required
                >
                  {MARKET_TYPES.map(mt => (
                    <MenuItem key={mt} value={mt}>
                      {mt}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Pick"
                  value={pick}
                  onChange={e => setPick(e.target.value)}
                  helperText={marketType === 'WINNER' ? 'e.g., HOME or AWAY' : 'Free text'}
                  required
                />

                <TextField
                  label="Odds"
                  type="number"
                  inputProps={{ step: '0.01' }}
                  value={odds}
                  onChange={e => setOdds(e.target.value)}
                  required
                />

                <TextField
                  label="Amount (cents)"
                  type="number"
                  inputProps={{ min: 1 }}
                  value={amountCents}
                  onChange={e => setAmountCents(e.target.value)}
                  required
                />

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Button type="submit" variant="contained">
                    Propose Bet
                  </Button>
                </div>
              </form>
            )}
          </section>
        </main>
      </div>
    </Box>
  );
}
