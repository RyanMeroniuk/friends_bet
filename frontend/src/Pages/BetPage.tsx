import React, { useEffect, useState } from 'react';
import { listMyGroups } from '../api/group';
import { listBets, proposeBet, acceptBet, Bet } from '../api/bet';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  Divider,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';

export default function BetPage() {
  // Load only groups the user belongs to
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [bets, setBets]       = useState<Bet[]>([]);
  const [userId, setUserId]   = useState<string>('');
  const [gameId, setGameId]   = useState<string>('');
  const [pick, setPick]       = useState<string>('home');
  const [amount, setAmount]   = useState<number>(0);
  const [odds, setOdds]       = useState<number>(1.8);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  // 1) Load "my" groups on mount
  useEffect(() => {
    const auth = JSON.parse(localStorage.getItem('authUser')!);
    listMyGroups(auth.id)
      .then(gs => setGroups(gs.map(g => ({ id: g.id, name: g.name }))))
      .catch(() => setError('Could not load your groups'));
  }, []);

  // 2) When selectedGroup changes, load its bets
  useEffect(() => {
    if (!selectedGroup) return;
    loadBets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup]);

  async function loadBets() {
    try {
      setError(null);
      const data = await listBets(selectedGroup);
      setBets(data);
    } catch (e: any) {
      setError(e.response?.data || 'Could not load bets');
    }
  }

  async function onPropose() {
    setMessage(null);
    try {
      await proposeBet(selectedGroup, userId, gameId, 'win', pick, amount, odds);
      setMessage('Bet proposed!');
      loadBets();
    } catch (e: any) {
      setError(e.response?.data || 'Error proposing bet');
    }
  }

  async function onAccept(betId: string) {
    setMessage(null);
    try {
      await acceptBet(betId, userId);
      setMessage('Bet accepted!');
      loadBets();
    } catch (e: any) {
      setError(e.response?.data || 'Error accepting bet');
    }
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Bets
      </Typography>

      {/* Group selector */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="group-select-label">Select Group</InputLabel>
        <Select
          labelId="group-select-label"
          value={selectedGroup}
          label="Select Group"
          onChange={e => setSelectedGroup(e.target.value)}
        >
          {groups.map(g => (
            <MenuItem key={g.id} value={g.id}>
              {g.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {!selectedGroup ? (
        <Typography>Select a group to view or create bets.</Typography>
      ) : (
        <>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          {message && (
            <Typography color="secondary" sx={{ mb: 2 }}>
              {message}
            </Typography>
          )}

          {/* List existing bets */}
          <List>
            {bets.map(b => (
              <ListItem
                key={b.id}
                sx={{ flexDirection: 'column', alignItems: 'flex-start' }}
              >
                <Typography>
                  <strong>{b.pick}</strong> @ {b.odds} — $
                  {(b.amountCents / 100).toFixed(2)} — Status: {b.status}
                </Typography>
                {b.status === 'OPEN' && (
                  <Button
                    size="small"
                    onClick={() => onAccept(b.id)}
                    sx={{ mt: 1 }}
                  >
                    Accept
                  </Button>
                )}
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 3 }} />

          {/* Propose a new bet */}
          <Typography variant="h6" gutterBottom>
            Propose a New Bet
          </Typography>
          <Box
            component="form"
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 2,
            }}
            onSubmit={e => {
              e.preventDefault();
              onPropose();
            }}
          >
            <TextField
              label="Your User ID"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              required
            />
            <TextField
              label="Game ID"
              value={gameId}
              onChange={e => setGameId(e.target.value)}
              required
            />
            <TextField
              label="Pick (home/away)"
              value={pick}
              onChange={e => setPick(e.target.value)}
              required
            />
            <TextField
              label="Odds"
              type="number"
              value={odds}
              onChange={e => setOdds(+e.target.value)}
              inputProps={{ step: '0.01' }}
              required
            />
            <TextField
              label="Amount (cents)"
              type="number"
              value={amount}
              onChange={e => setAmount(+e.target.value)}
              required
            />
            <Button
              type="submit"
              variant="contained"
              sx={{ gridColumn: 'span 2' }}
            >
              Propose Bet
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
