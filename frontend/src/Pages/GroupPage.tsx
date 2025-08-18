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

export default function GroupPage() {
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [members, setMembers] = useState<GroupMemberResponse[]>([]);
  const [newName, setNewName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinUserId, setJoinUserId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const { groupId, setGroupId } = useGroup();
  const navigate = useNavigate();

  // current user (same as your existing logic)
  const auth = JSON.parse(localStorage.getItem('authUser') || '{}');
  const currentUserId: string = auth.id;

  // load my groups on mount
  useEffect(() => {
    (async () => {
      try {
        const mine = await listMyGroups(currentUserId);
        setGroups(mine);
        // if nothing selected yet, pick the first group
        if (!groupId && mine.length > 0) {
          setGroupId(mine[0].id);
        }
      } catch (err) {
        console.error('Failed to load your groups', err);
        setMessage('Failed to load your groups');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // derive the selected group
  const selectedGroup: GroupResponse | undefined = useMemo(
    () => groups.find(g => g.id === groupId),
    [groups, groupId]
  );

  // whenever selected group changes, load members
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

  // actions
  async function reloadGroupsAndStay() {
    const mine = await listMyGroups(currentUserId);
    setGroups(mine);
    // keep current selection if it still exists; otherwise pick first available
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
    setMessage(null);
    try {
      const grp = await createGroup(newName.trim());
      // auto-join yourself
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
    setMessage(null);
    try {
      const grp = await joinGroup(inviteCode.trim(), joinUserId.trim() || currentUserId);
      setInviteCode('');
      setJoinUserId('');
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

  // styles (kept simple / inline like your current page)
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
        {/* LEFT: sidebar (create/join + list) */}
        <aside style={card}>
          <h3 style={{ marginTop: 0 }}>Create a Group</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="New group name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="button" onClick={handleCreate} disabled={!newName.trim()}>
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
            {/* optional userId; defaults to current user if empty */}
            <input
              placeholder="Your User ID (optional)"
              value={joinUserId}
              onChange={e => setJoinUserId(e.target.value)}
            />
            <button
              type="button"
              onClick={handleJoin}
              disabled={!inviteCode.trim()}
            >
              Join Group
            </button>
          </div>

          <hr style={{ margin: '1rem 0' }} />

          <h3>Your Groups</h3>
          <div>
            {groups.length === 0 && <div>No groups yet.</div>}
            {groups.map(g => (
              <div
                key={g.id}
                style={listItem(g.id === groupId)}
                onClick={() => selectGroup(g)}
                title="Select group"
              >
                <div style={{ fontWeight: 600 }}>{g.name}</div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  Code: {g.inviteCode}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* RIGHT: details for selected group */}
        <main style={card}>
          {!selectedGroup ? (
            <div>Select a group on the left to see details.</div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0 }}>{selectedGroup.name}</h3>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 14, color: '#555' }}>
                      Invite Code:
                    </span>{' '}
                    <code>{selectedGroup.inviteCode}</code>{' '}
                    <button
                      type="button"
                      onClick={() => copyInvite(selectedGroup.inviteCode)}
                      style={{ marginLeft: 6 }}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <button type="button" onClick={() => enterGroup(selectedGroup)}>
                    Enter Group
                  </button>
                </div>
              </div>

              <hr style={{ margin: '1rem 0' }} />

              <section>
                <h4 style={{ marginTop: 0 }}>Members</h4>
                {loadingMembers ? (
                  <div>Loading members…</div>
                ) : members.length === 0 ? (
                  <div>No members found.</div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {members.map(m => (
                      <li key={m.id}>
                        <strong>{m.username || m.userId}</strong>{' '}
                        <span style={{ color: '#666', fontSize: 12 }}>
                          (joined {new Date(m.joinedAt).toLocaleString()})
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
