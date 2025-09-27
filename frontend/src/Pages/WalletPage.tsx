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
import { useAuth } from '../context/AuthContext';

export default function WalletPage() {
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [depositAmt, setDepositAmt] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingBal, setLoadingBal] = useState(false);

  const { groupId, setGroupId } = useGroup();
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';

  useEffect(() => {
    if (!currentUserId) return;
    (async () => {
      try {
        const mine = await listMyGroups(currentUserId);
        setGroups(mine);
        if (!groupId && mine.length > 0) setGroupId(mine[0].id);
      } catch {
        setError('Failed to load your groups');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const selected = useMemo(
    () => groups.find(g => g.id === groupId),
    [groups, groupId]
  );

  useEffect(() => {
    if (!selected || !currentUserId) {
      setBalance(null);
      return;
    }
    (async () => {
      try {
        setLoadingBal(true);
        setError(null);
        const bal = await getMyBalance(selected.id, currentUserId);
        setBalance(bal);
      } catch (e: any) {
        setError(e?.response?.data || 'Could not load balance');
        setBalance(null);
      } finally {
        setLoadingBal(false);
      }
    })();
  }, [selected, currentUserId]);

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
    if (!selected || !currentUserId) return;

    try {
      const wallet = await deposit(selected.id, currentUserId, amountCents);
      setMessage(`Deposited $${(amountCents / 100).toFixed(2)}.`);
      setDepositAmt('');
      setBalance(wallet.balanceCents);
    } catch (e: any) {
      setError(e?.response?.data || 'Error making deposit');
    }
  }

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
                  onClick={async () => {
                    if (!selected || !currentUserId) return;
                    try {
                      setLoadingBal(true);
                      const bal = await getMyBalance(selected.id, currentUserId);
                      setBalance(bal);
                    } catch (e: any) {
                      setError(e?.response?.data || 'Could not refresh balance');
                    } finally {
                      setLoadingBal(false);
                    }
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
                  ? `$${((balance || 0) / 100).toFixed(2)}`
                  : '—'}
              </Typography>

              <Typography variant="h6" sx={{ mt: 2 }}>
                Deposit Funds
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 1 }}>
                <TextField
                  label="Amount (cents)"
                  value={depositAmt}
                  size="small"
                  onChange={e => setDepositAmt(e.target.value)}
                />
                <Button variant="contained" onClick={handleDeposit} disabled={!currentUserId}>
                  Deposit
                </Button>
              </Box>

              <Typography variant="body2" sx={{ mt: 2, color: '#666' }}>
                Deposits are instant and reflected immediately in your wallet balance.
              </Typography>
            </>
          )}
        </main>
      </div>
    </Box>
  );
}
