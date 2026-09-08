import React, { useEffect, useState } from 'react';
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
import Modal from '../components/Modal';
import { ToastContainer, ToastItem } from '../components/Toast';
import '../styles/ui.css';

export default function GroupPage() {
  const { user } = useAuth();
  const { groupId, setGroupId } = useGroup();
  const navigate = useNavigate();
  const userId = user?.id ?? '';

  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<GroupMemberResponse[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(groupId);

  // modals
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  // toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toast = (text: string, tone: ToastItem['tone'] = 'info') => {
    const id = crypto.randomUUID();
    setToasts((p) => [...p, { id, text, tone }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
  };

  async function loadGroups() {
    try {
      const data = await listMyGroups(userId);
      setGroups(data);
    } catch {
      toast('Failed to load groups', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userId) loadGroups();
  }, [userId]);

  // load members when a group is selected
  useEffect(() => {
    if (!selectedId) { setMembers([]); return; }
    listGroupMembers(selectedId).then(setMembers).catch(() => setMembers([]));
  }, [selectedId]);

  function selectGroup(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
    setGroupId(id);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      const grp = await createGroup(newName.trim());
      await joinGroup(grp.inviteCode, userId);
      setNewName('');
      setCreateOpen(false);
      toast('Group created', 'success');
      await loadGroups();
      selectGroup(grp.id);
    } catch (e: any) {
      toast(e?.response?.data || 'Failed to create group', 'error');
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) return;
    try {
      await joinGroup(inviteCode.trim(), userId);
      setInviteCode('');
      setJoinOpen(false);
      toast('Joined group', 'success');
      await loadGroups();
    } catch (e: any) {
      toast(e?.response?.data || 'Failed to join group', 'error');
    }
  }

  const selected = groups.find((g) => g.id === selectedId);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: 'var(--fb-text)', margin: 0, fontSize: 22, fontWeight: 700 }}>Groups</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="fb-btn fb-btn--ghost fb-btn--sm" onClick={() => setJoinOpen(true)}>
            Join Group
          </button>
          <button className="fb-btn fb-btn--primary fb-btn--sm" onClick={() => setCreateOpen(true)}>
            New Group
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 320px' : '1fr', gap: 24 }}>
        {/* Group list */}
        <div>
          {loading ? (
            <div style={{ color: 'var(--fb-muted)', padding: 40, textAlign: 'center' }}>Loading…</div>
          ) : groups.length === 0 ? (
            <div className="fb-glass" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ color: 'var(--fb-muted)', marginBottom: 12 }}>No groups yet</div>
              <button className="fb-btn fb-btn--primary fb-btn--sm" onClick={() => setCreateOpen(true)}>
                Create your first group
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => selectGroup(g.id)}
                  className="fb-glass"
                  style={{
                    textAlign: 'left',
                    padding: 16,
                    cursor: 'pointer',
                    border: selectedId === g.id ? '1px solid var(--fb-accent)' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--fb-text)', fontSize: 16, marginBottom: 6 }}>
                    {g.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fb-muted)', fontFamily: 'monospace' }}>
                    {g.inviteCode}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="fb-glass" style={{ padding: 20, borderRadius: 12, alignSelf: 'start' }}>
            <h3 style={{ color: 'var(--fb-text)', margin: '0 0 12px', fontSize: 18 }}>{selected.name}</h3>

            <div style={{ fontSize: 13, color: 'var(--fb-muted)', marginBottom: 16 }}>
              <div style={{ marginBottom: 4 }}>
                Invite code:{' '}
                <span
                  style={{ color: 'var(--fb-text)', cursor: 'pointer' }}
                  onClick={() => {
                    navigator.clipboard?.writeText(selected.inviteCode).catch(() => {});
                    toast('Copied invite code', 'info');
                  }}
                >
                  {selected.inviteCode} ⎘
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fb-text)', marginBottom: 8 }}>
                Members ({members.length})
              </div>
              {members.map((m) => (
                <div key={m.id} style={{ fontSize: 13, color: 'var(--fb-muted)', padding: '4px 0' }}>
                  {m.username}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="fb-btn fb-btn--primary fb-btn--sm"
                onClick={() => navigate(`/dashboard/groups/${selected.id}/bets`)}
              >
                View Bets
              </button>
              <button
                className="fb-btn fb-btn--ghost fb-btn--sm"
                onClick={() => { setSelectedId(null); setMembers([]); }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal open={createOpen} title="New Group" onClose={() => setCreateOpen(false)} width={400} footer={
        <>
          <button className="fb-btn fb-btn--ghost fb-btn--md" onClick={() => setCreateOpen(false)}>Cancel</button>
          <button className="fb-btn fb-btn--primary fb-btn--md" onClick={handleCreate} disabled={!newName.trim()}>Create</button>
        </>
      }>
        <label style={{ display: 'block', color: 'var(--fb-text)', fontSize: 13, marginBottom: 6 }}>Group name</label>
        <input
          className="fb-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. Sunday Squad"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
      </Modal>

      {/* Join modal */}
      <Modal open={joinOpen} title="Join Group" onClose={() => setJoinOpen(false)} width={400} footer={
        <>
          <button className="fb-btn fb-btn--ghost fb-btn--md" onClick={() => setJoinOpen(false)}>Cancel</button>
          <button className="fb-btn fb-btn--primary fb-btn--md" onClick={handleJoin} disabled={!inviteCode.trim()}>Join</button>
        </>
      }>
        <label style={{ display: 'block', color: 'var(--fb-text)', fontSize: 13, marginBottom: 6 }}>Invite code</label>
        <input
          className="fb-input"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder="Paste the code"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
        />
      </Modal>

      <ToastContainer items={toasts} onClose={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}
