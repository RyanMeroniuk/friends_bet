import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { listMyGroups, GroupResponse } from '../api/group';
import { useGroup } from '../context/GroupContext';

export default function BetPage() {
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  // current user
  const auth = JSON.parse(localStorage.getItem('authUser') || '{}');
  const userId: string = auth.id;

  // shared selection across pages
  const { groupId, setGroupId } = useGroup();

  // load only *my* groups
  useEffect(() => {
    (async () => {
      try {
        const mine = await listMyGroups(userId);
        setGroups(mine);
        if (!groupId && mine.length > 0) setGroupId(mine[0].id);
      } catch {
        setError('Could not load your groups');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const selected = useMemo(
    () => groups.find(g => g.id === groupId),
    [groups, groupId]
  );

  function selectGroup(id: string) {
    setGroupId(id);
  }

  // same look/feel as Groups/Wallets
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
        Bets
      </Typography>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
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
              <div style={{ fontSize: 12, color: '#666' }}>
                Code: {g.inviteCode}
              </div>
            </div>
          ))}
        </aside>

        {/* RIGHT: placeholder for now */}
        <main style={card}>
          {!selected ? (
            <div>Select a group on the left to place bets.</div>
          ) : (
            <>
              <Typography variant="h6" sx={{ m: 0 }}>
                Working in: {selected.name}
              </Typography>
              <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>
                Invite Code: <code>{selected.inviteCode}</code>
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body1" sx={{ color: '#555' }}>
                (Right panel UI coming next: market selector, picks, odds, open bets, etc.)
              </Typography>
            </>
          )}
        </main>
      </div>
    </Box>
  );
}
