import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { listMyGroups } from '../api/group';
import { getMyBalance, deposit } from '../api/wallet';

interface GroupOption {
  id: string;
  name: string;
}

export default function WalletPage() {
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [balance, setBalance] = useState<number | null>(null);
  const [depositAmt, setDepositAmt] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const auth = JSON.parse(localStorage.getItem('authUser') || '{}');
  const userId: string = auth.id;

  useEffect(() => {
    listMyGroups(userId)
      .then(gs => setGroups(gs.map(g => ({ id: g.id, name: g.name }))))
      .catch(() => setError('Failed to load your groups'));
  }, [userId]);

  useEffect(() => {
    if (!selectedGroup) {
      setBalance(null);
      return;
    }
    fetchMyBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup]);

  async function fetchMyBalance() {
    try {
      setError(null);
      const bal = await getMyBalance(selectedGroup, userId);
      setBalance(bal);
    } catch (e: any) {
      console.error('fetchMyBalance error:', e);
      setError(e.response?.data || 'Could not load balance');
    }
  }

  async function handleDeposit() {
    setMessage(null);
    setError(null);

    const amountCents = parseInt(depositAmt, 10);
    if (isNaN(amountCents) || amountCents <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    console.log('▶️ handleDeposit:', { selectedGroup, amountCents, userId });

    try {
      const wallet = await deposit(selectedGroup, userId, amountCents);
      setMessage(`Deposited $${(amountCents / 100).toFixed(2)}`);
      setDepositAmt('');
      setBalance(wallet.balanceCents);
    } catch (e: any) {
      console.error('deposit error:', e.response ?? e);
      setError(e.response?.data || 'Error making deposit');
    }
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Wallet
      </Typography>

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

      {error && <Typography color="error">{error}</Typography>}

      {selectedGroup && (
        <>
          <Typography sx={{ mb: 2 }}>
            Current Balance:{' '}
            {balance !== null ? `$${(balance / 100).toFixed(2)}` : 'Loading…'}
          </Typography>

          <Box
            component="form"
            onSubmit={e => {
              e.preventDefault();
              handleDeposit();
            }}
            sx={{ display: 'flex', gap: 2, alignItems: 'center' }}
          >
            <TextField
              label="Amount (cents)"
              type="text"
              value={depositAmt}
              onChange={e => setDepositAmt(e.target.value)}
              placeholder="e.g. 1000"
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
              required
            />
            <Button type="button" variant="contained" onClick={handleDeposit}>
              Deposit
            </Button>
          </Box>

          {message && (
            <Typography color="primary" sx={{ mt: 2 }}>
              {message}
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}
