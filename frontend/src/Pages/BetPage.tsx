import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  listBets,
  proposeBet,
  acceptBet,
  Bet
} from '../api/bet';

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
  const { groupId } = useParams<{ groupId: string }>();
  const [bets, setBets]           = useState<Bet[]>([]);
  const [userId, setUserId]       = useState('');
  const [gameId, setGameId]       = useState('');
  const [pick, setPick]           = useState('home');
  const [amount, setAmount]       = useState(0);
  const [odds, setOdds]           = useState(1.8);
  const [message, setMessage]     = useState<string | null>(null);

  useEffect(() => {
    if (groupId) loadBets();
  }, [groupId]);

  async function loadBets() {
    const data = await listBets(groupId!);
    setBets(data);
  }

  async function onPropose() {
    try {
      await proposeBet(groupId!, userId, gameId, 'win', pick, amount, odds);
      setMessage('Bet proposed');
      loadBets();
    } catch (e: any) {
      setMessage(e.response?.data || 'Error');
    }
  }

  async function onAccept(betId: string) {
    try {
      await acceptBet(betId, userId);
      setMessage('Bet accepted');
      loadBets();
    } catch (e: any) {
      setMessage(e.response?.data || 'Error');
    }
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Bets for Group {groupId}
      </Typography>
      {message && (
        <Typography color="secondary" sx={{ mb: 2 }}>
          {message}
        </Typography>
      )}

      <List>
        {bets.map(b => (
          <ListItem key={b.id} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <Typography>
              <strong>{b.pick}</strong> @ {b.odds} — ${(b.amountCents/100).toFixed(2)} —
              Status: {b.status}
            </Typography>
            {b.status === 'OPEN' && (
              <Button size="small" onClick={() => onAccept(b.id)}>
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
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
        <TextField
          label="Your User ID"
          value={userId}
          onChange={e => setUserId(e.target.value)}
        />
        <TextField
          label="Game ID"
          value={gameId}
          onChange={e => setGameId(e.target.value)}
        />
        <TextField
          label="Pick (home/away)"
          value={pick}
          onChange={e => setPick(e.target.value)}
        />
        <TextField
          label="Odds"
          type="number"
          value={odds}
          onChange={e => setOdds(+e.target.value)}
        />
        <TextField
          label="Amount (cents)"
          type="number"
          value={amount}
          onChange={e => setAmount(+e.target.value)}
        />
        <Button variant="contained" onClick={onPropose} sx={{ gridColumn: 'span 4' }}>
          Propose Bet
        </Button>
      </Box>
    </Box>
);
}
