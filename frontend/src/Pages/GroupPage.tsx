import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listMyGroups,
  createGroup,
  joinGroup,
  listGroupMembers,
  GroupResponse,
  GroupMemberResponse,
} from '../api/group';
import { useGroup } from '../context/GroupContext';
import { useAuth } from '../context/AuthContext';

export default function GroupPage() {
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [members, setMembers] = useState<GroupMemberResponse[]>([]);
  const [newName, setNewName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinUserId, setJoinUserId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const { groupId, setGroupId } = useGroup();
  const { user } = useAuth();
  const navigate = useNavigate();

  const currentUserId: string = user?.id ?? '';

  useEffect(() => {
    setJoinUserId(currentUserId || '');
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    (async () => {
      try {
        const mine = await listMyGroups(currentUserId);
        setGroups(mine);
        if (!groupId && mine.length > 0) {
          setGroupId(mine[0].id);
        }
      } catch (err) {
        console.error('Failed to load your groups', err);
        setMessage('Failed to load your groups');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const selectedGroup: GroupResponse | undefined = useMemo(
    () => groups.find(g => g.id === groupId),
    [groups, groupId]
  );

  useEffect(() => {
    if (!selectedGroup) {
      setMembers([]);
      return;
    }
    (async () => {
      try {
        setLoadingMembers(true);
        const m = await listGroupMembers(selectedGroup.id);
        setMembers(m);
      } catch (err) {
        console.error('Failed to load members', err);
        setMessage('Failed to load members');
        setMembers([]);
      } finally {
        setLoadingMembers(false);
      }
    })();
  }, [selectedGroup]);

  async function reloadGroupsAndStay() {
    if (!currentUserId) return;
    const mine = await listMyGroups(currentUserId);
    setGroups(mine);
    if (mine.length > 0) {
      const stillExists = mine.some(g => g.id === groupId);
      if (!stillExists) {
        setGroupId(mine[0].id);
      }
    } else {
      setGroupId(null as any);
    }
  }

  async function handleCreate() {
    if (!currentUserId) return;
    setMessage(null);
    try {
      const grp = await createGroup(newName.trim());
      await joinGroup(grp.inviteCode, currentUserId);

      setNewName('');
      setMessage('Group created and you’ve joined it!');
      await reloadGroupsAndStay();
      setGroupId(grp.id);
    } catch (err: any) {
      console.error('create/join error:', err.response ?? err);
      setMessage(err?.response?.data || 'Error creating or joining group');
    }
  }

  async function handleJoin() {
    if (!currentUserId) return;
    setMessage(null);
    try {
      const grp = await joinGroup(inviteCode.trim(), joinUserId.trim() || currentUserId);
      setInviteCode('');
      setJoinUserId(currentUserId || '');
      setMessage('Successfully joined group!');
      await reloadGroupsAndStay();
      setGroupId(grp.id);
    } catch (err: any) {
      console.error('joinGroup failed:', err.response ?? err);
      setMessage(err?.response?.data || 'Error joining group');
    }
  }

  function selectGroup(grp: GroupResponse) {
    setGroupId(grp.id);
  }

  function enterGroup(grp: GroupResponse) {
    setGroupId(grp.id);
    navigate(`${grp.id}/bets`);
  }

  async function copyInvite(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setMessage('Invite code copied to clipboard');
      setTimeout(() => setMessage(null), 2000);
    } catch {
      setMessage('Could not copy invite code');
    }
  }

  const layout: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    gap: '1.25rem',
    alignItems: 'start',
    padding: '1.5rem',
  };
  const card: React.CSSProperties = {
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '1rem',
    background: '#fff',
  };
  const listItem = (active: boolean): React.CSSProperties => ({
    padding: '0.5rem 0.6rem',
    borderRadius: 6,
    cursor: 'pointer',
    background: active ? '#eef5ff' : 'transparent',
    border: active ? '1px solid #cfe3ff' : '1px solid transparent',
    marginBottom: 6,
  });

  return (
    <div style={{ maxWidth: 1100, margin: '1.75rem auto' }}>
      <h2>Your Groups</h2>
      {message && <p style={{ color: '#0a6' }}>{message}</p>}

      <div style={layout}>
        <aside style={card}>
          <h3 style={{ marginTop: 0 }}>Create a Group</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="New group name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="button" onClick={handleCreate} disabled={!newName.trim() || !currentUserId}>
              Create
            </button>
          </div>

          <hr style={{ margin: '1rem 0' }} />

          <h3>Join by Invite</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              placeholder="Invite Code"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
            />
            <input
              placeholder="Your User ID (optional)"
              value={joinUserId}
              onChange={e => setJoinUserId(e.target.value)}
            />
            <button type="button" onClick={handleJoin} disabled={!inviteCode.trim() || !currentUserId}>
              Join
            </button>
          </div>

          <hr style={{ margin: '1rem 0' }} />

          <h3>Your Groups</h3>
          {groups.length === 0 && <div>No groups yet.</div>}
          {groups.map(g => (
            <div
              key={g.id}
              style={listItem(g.id === groupId)}
              onClick={() => selectGroup(g)}
              onDoubleClick={() => enterGroup(g)}
            >
              <div style={{ fontWeight: 600 }}>{g.name}</div>
              <div style={{ fontSize: 12, color: '#666' }}>Invite: {g.inviteCode}</div>
            </div>
          ))}
        </aside>

        <section style={card}>
          {!selectedGroup ? (
            <div>Select a group to view its members.</div>
          ) : (
            <>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{selectedGroup.name}</h3>
                  <div style={{ fontSize: 13, color: '#666' }}>
                    Invite Code: <code>{selectedGroup.inviteCode}</code>
                  </div>
                </div>
                <button type="button" onClick={() => copyInvite(selectedGroup.inviteCode)}>
                  Copy Invite
                </button>
              </header>

              <hr style={{ margin: '1rem 0' }} />

              <h4 style={{ marginTop: 0 }}>Members</h4>
              {loadingMembers && <div>Loading members…</div>}
              {!loadingMembers && members.length === 0 && <div>No members yet.</div>}
              {!loadingMembers && members.length > 0 && (
                <ul style={{ paddingLeft: 16 }}>
                  {members.map(m => (
                    <li key={m.id}>
                      {m.username} — joined {new Date(m.joinedAt).toLocaleString()}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
