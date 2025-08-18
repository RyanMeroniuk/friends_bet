import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
} from '@mui/material';
import { listMyGroups, GroupResponse } from '../api/group';
import { getMyBalance, deposit } from '../api/wallet';
import { useGroup } from '../context/GroupContext';

export default function WalletPage() {
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [depositAmt, setDepositAmt] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingBal, setLoadingBal] = useState(false);

  // current user
  const auth = JSON.parse(localStorage.getItem('authUser') || '{}');
  const userId: string = auth.id;

  // share the selected group id across pages
  const { groupId, setGroupId } = useGroup();

  // load “my groups” on mount
  useEffect(() => {
    (async () => {
      try {
        const mine = await listMyGroups(userId);
        setGroups(mine);
        // auto-pick first if none selected yet
        if (!groupId && mine.length > 0) setGroupId(mine[0].id);
      } catch {
        setError('Failed to load your groups');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // selected group object
  const selected = useMemo(
    () => groups.find(g => g.id === groupId),
    [groups, groupId]
  );

  // fetch balance whenever selected group changes
  useEffect(() => {
    if (!selected) {
      setBalance(null);
      return;
    }
    (async () => {
      try {
        setLoadingBal(true);
        setError(null);
        const bal = await getMyBalance(selected.id, userId);
        setBalance(bal);
      } catch (e: any) {
        setError(e?.response?.data || 'Could not load balance');
        setBalance(null);
      } finally {
        setLoadingBal(false);
      }
    })();
  }, [selected, userId]);

  function selectGroup(id: string) {
    setGroupId(id);
    setMessage(null);
    setError(null);
  }

  async function handleDeposit() {
    setMessage(null);
    setError(null);

    const amountCents = parseInt(depositAmt, 10);
    if (isNaN(amountCents) || amountCents <= 0) {
      setError('Please enter a valid positive amount (in cents).');
      return;
    }
    if (!selected) return;

    try {
      const wallet = await deposit(selected.id, userId, amountCents);
      setMessage(`Deposited $${(amountCents / 100).toFixed(2)}.`);
      setDepositAmt('');
      setBalance(wallet.balanceCents);
    } catch (e: any) {
      setError(e?.response?.data || 'Error making deposit');
    }
  }

  // simple styles to mirror your Groups page
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

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Wallet
      </Typography>

      {message && (
        <Typography sx={{ mb: 2 }} color="primary">
          {message}
        </Typography>
      )}
      {error && (
        <Typography sx={{ mb: 2 }} color="error">
          {error}
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
              <div style={{ fontSize: 12, color: '#666' }}>Code: {g.inviteCode}</div>
            </div>
          ))}
        </aside>

        {/* RIGHT: selected group wallet */}
        <main style={card}>
          {!selected ? (
            <div>Select a group on the left to view your wallet.</div>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Box>
                  <Typography variant="h6" sx={{ m: 0 }}>
                    {selected.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Invite Code: <code>{selected.inviteCode}</code>
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    if (!selected) return;
                    // re-fetch balance
                    (async () => {
                      try {
                        setLoadingBal(true);
                        const bal = await getMyBalance(selected.id, userId);
                        setBalance(bal);
                      } catch (e: any) {
                        setError(e?.response?.data || 'Could not refresh balance');
                      } finally {
                        setLoadingBal(false);
                      }
                    })();
                  }}
                >
                  Refresh
                </Button>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Typography sx={{ mb: 2, fontSize: 18 }}>
                Current Balance:{' '}
                {loadingBal
                  ? 'Loading…'
                  : balance !== null
                  ? `$${(balance / 100).toFixed(2)}`
                  : '—'}
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
                  sx={{ maxWidth: 240 }}
                />
                <Button type="submit" variant="contained">
                  Deposit
                </Button>
              </Box>
            </>
          )}
        </main>
      </div>
    </Box>
  );
}
