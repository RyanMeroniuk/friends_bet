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

/* === Step 1 wrappers === */
import TwoColumn from '../components/TwoColumn';
import RightRail from '../components/RightRail';
import SectionCard from '../components/SectionCard';
import '../styles/groups.css';

/* === Step 2 primitives === */
import Button from '../components/Button';
import Input from '../components/Input';
import '../styles/ui.css';

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

  /* ====== RENDER (layout + primitives, no logic changes) ====== */

  const mainColumn = (
    <>
      <div>
        <h1 className="fb-page-title">Your Groups</h1>
        <p className="fb-page-subtitle">Select a group to view its members.</p>
        {message && <p style={{ color: '#0a6', marginTop: 8 }}>{message}</p>}
      </div>

      <SectionCard>
        {!selectedGroup ? (
          <div>Select a group from the sidebar to view its details.</div>
        ) : (
          <>
            <header
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>{selectedGroup.name}</h3>
                <div style={{ fontSize: 13, color: '#666' }}>
                  Invite Code: <code>{selectedGroup.inviteCode}</code>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => copyInvite(selectedGroup.inviteCode)}
              >
                Copy Invite
              </Button>
            </header>

            <hr style={{ margin: '1rem 0' }} />

            <h4 style={{ marginTop: 0 }}>Members</h4>
            {loadingMembers && <div>Loading members…</div>}
            {!loadingMembers && members.length === 0 && <div>No members yet.</div>}
            {!loadingMembers && members.length > 0 && (
              <ul style={{ paddingLeft: 16, margin: 0 }}>
                {members.map(m => (
                  <li key={m.id}>
                    {m.username} — joined {new Date(m.joinedAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </SectionCard>
    </>
  );

  const rightRail = (
    <RightRail>
      {/* Create Group */}
      <SectionCard title="Create a Group">
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            placeholder="New group name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            aria-label="New group name"
            style={{ flex: 1 }}
          />
          <Button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim() || !currentUserId}
          >
            Create
          </Button>
        </div>
      </SectionCard>

      {/* Join Group */}
      <SectionCard title="Join by Invite" subtitle="Enter an invite code to join a group">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Input
            placeholder="Invite Code"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value)}
            aria-label="Invite Code"
          />
          <Input
            placeholder="Your User ID (optional)"
            value={joinUserId}
            onChange={e => setJoinUserId(e.target.value)}
            aria-label="User ID"
          />
          <Button
            type="button"
            onClick={handleJoin}
            disabled={!inviteCode.trim() || !currentUserId}
            style={{ width: '100%' }}
          >
            Join
          </Button>
        </div>
      </SectionCard>

      {/* Your Groups list */}
      <SectionCard title="Your Groups">
        {groups.length === 0 && <div>No groups yet.</div>}
        {groups.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {groups.map(g => {
              const active = g.id === groupId;
              return (
                <li key={g.id} style={{ marginBottom: 6 }}>
                  <Button
                    variant="ghost"
                    onClick={() => selectGroup(g)}
                    onDoubleClick={() => enterGroup(g)}
                    style={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      border: active ? '1px solid #cfe3ff' : '1px solid #e5e7eb',
                      background: active ? '#eef5ff' : '#ffffff',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{g.name}</div>
                    <div style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
                      Invite: {g.inviteCode}
                    </div>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </RightRail>
  );

  return <TwoColumn main={mainColumn} right={rightRail} />;
}
