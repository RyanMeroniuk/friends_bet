import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { listBalances, deposit, WalletResponse } from '../api/wallet';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  Divider
} from '@mui/material';

export default function WalletPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [wallets, setWallets] = useState<WalletResponse[]>([]);
  const [amount, setAmount]   = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const userId = localStorage.getItem('userId') || '';

  useEffect(() => {
    if (groupId) loadBalances();
  }, [groupId]);

  async function loadBalances() {
    try {
      const data = await listBalances(groupId!);
      setWallets(data);
    } catch {
      setMessage('Failed to load balances');
    }
  }

  async function onDeposit() {
    if (!groupId){
        console.error('onDeposit: no groupId in context');
        return;
    }

    try {
        console.log('Depositing', amount, 'cents into group', groupId, 'for user', userId);
      await deposit(groupId, userId, parseInt(amount, 10));
      setMessage('Deposit successful');
      setAmount('');
      loadBalances();
    } catch (e: any) {
        console.error('Deposit failed:', e.response ?? e);
      setMessage(e.response?.data || 'Deposit failed');
    }
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Wallets for Group {groupId}
      </Typography>

      {message && (
        <Typography color="error" sx={{ mb: 2 }}>
          {message}
        </Typography>
      )}

      <List>
        {wallets.map(w => (
          <ListItem key={w.userId}>
            User {w.userId}: ${(w.balanceCents / 100).toFixed(2)}
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6">Deposit Funds</Typography>
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <TextField
          label="Amount (cents)"
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
        <Button variant="contained" onClick={onDeposit}>
          Deposit
        </Button>
      </Box>
    </Box>
  );
}
