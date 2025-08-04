// frontend/src/pages/BetPage.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroup } from '../context/GroupContext';
import { listBets, proposeBet, acceptBet, Bet } from '../api/bet';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  Divider
} from '@mui/material';

export default function BetPage() {
  const { groupId } = useGroup();
  const navigate    = useNavigate();

  const [bets, setBets]       = useState<Bet[]>([]);
  const [userId, setUserId]   = useState<string>('');
  const [gameId, setGameId]   = useState<string>('');
  const [pick, setPick]       = useState<string>('home');
  const [amount, setAmount]   = useState<number>(0);
  const [odds, setOdds]       = useState<number>(1.8);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    // if no group selected, redirect back to groups list
    if (!groupId) {
      navigate('/dashboard/groups');
      return;
    }
    loadBets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  async function loadBets() {
    try {
      setError(null);
      const data = await listBets(groupId!);
      setBets(data);
    } catch (e: any) {
      console.error('Failed to load bets', e);
      setError(e.response?.data || 'Could not load bets');
    }
  }

  async function onPropose() {
    setMessage(null);
    try {
      await proposeBet(groupId!, userId, gameId, 'win', pick, amount, odds);
      setMessage('Bet proposed!');
      loadBets();
    } catch (e: any) {
      console.error('Propose bet failed', e);
      setMessage(e.response?.data || 'Error proposing bet');
    }
  }

  async function onAccept(betId: string) {
    setMessage(null);
    try {
      await acceptBet(betId, userId);
      setMessage('Bet accepted!');
      loadBets();
    } catch (e: any) {
      console.error('Accept bet failed', e);
      setMessage(e.response?.data || 'Error accepting bet');
    }
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Bets for Group {groupId}
      </Typography>

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
        <Button type="submit" variant="contained" sx={{ gridColumn: 'span 2' }}>
          Propose Bet
        </Button>
      </Box>
    </Box>
  );
}
