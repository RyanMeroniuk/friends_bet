import React, { useEffect, useMemo, useRef, useState } from 'react';
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

/* Step 1 wrappers */
import TwoColumn from '../components/TwoColumn';
import RightRail from '../components/RightRail';
import SectionCard from '../components/SectionCard';
import '../styles/groups.css';

/* Step 2 primitives */
import Button from '../components/Button';
import Input from '../components/Input';
import EmptyState from '../components/EmptyState';
import '../styles/ui.css';

/* Step 3 header (updated) */
import GroupsHeader from '../components/GroupsHeader';

/* Step 4 grid + card */
import GroupsGrid from '../components/GroupsGrid';
import { GroupCardProps } from '../components/GroupCard';

/* Step 5 skeletons + alert */
import GroupsGridSkeleton from '../components/GroupsGridSkeleton';
import GroupListSkeleton from '../components/GroupListSkeleton';
import Alert from '../components/Alert';

/* Step 6 micro-polish */
import { ToastContainer, ToastItem } from '../components/Toast';
import FormField from '../components/FormField';
import Avatar from '../components/Avatar';

/* Step 7 info cards */
import HowItWorksCard from '../components/HowItWorksCard';
import PopularSportsCard from '../components/PopularSportsCard';

/* Step 9 modal */
import Modal from '../components/Modal';

/* Step 11 */
import Tooltip from '../components/Tooltip';
import CodePill from '../components/CodePill';

/* Step 13 */
import Tabs from '../components/Tabs';

/* Step 14 (Overview widgets) */
import StatBadge from '../components/StatBadge';
import ActivityList from '../components/ActivityList';
import TipsCard from '../components/TipsCard';

export default function GroupPage() {
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [members, setMembers] = useState<GroupMemberResponse[]>([]);
  const [newName, setNewName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinUserId, setJoinUserId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false); // UI-only

  /* Step 3 UI state */
  const [searchQ, setSearchQ] = useState('');
  const [groupFilter, setGroupFilter] = useState<'all'>('all');

  /* Step 13 UI state */
  const [detailTab, setDetailTab] = useState<'overview' | 'members'>('overview');

  /* Toasts */
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  function pushToast(text: string, tone: ToastItem["tone"] = "info") {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, text, tone }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500);
  }
  function closeToast(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  /* Modals visibility */
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const { groupId, setGroupId } = useGroup();
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentUserId: string = user?.id ?? '';

  /* Ref to focus search with '/' */
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setJoinUserId(currentUserId || '');
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    (async () => {
      try {
        setLoadingGroups(true);
        const mine = await listMyGroups(currentUserId);
        setGroups(mine);
        if (!groupId && mine.length > 0) {
          setGroupId(mine[0].id);
        }
      } catch (err) {
        console.error('Failed to load your groups', err);
        setMessage('Failed to load your groups');
        pushToast('Failed to load your groups', 'error');
      } finally {
        setLoadingGroups(false);
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
        pushToast('Failed to load members', 'error');
        setMembers([]);
      } finally {
        setLoadingMembers(false);
      }
    })();
  }, [selectedGroup]);

  async function reloadGroupsAndStay() {
    if (!currentUserId) return;
    setLoadingGroups(true);
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
    setLoadingGroups(false);
  }

  async function handleCreate() {
    if (!currentUserId) return;
    setMessage(null);
    try {
      const grp = await createGroup(newName.trim());
      await joinGroup(grp.inviteCode, currentUserId);

      setNewName('');
      const msg = 'Group created and you’ve joined it!';
      setMessage(msg);
      pushToast(msg, 'success');
      await reloadGroupsAndStay();
      setGroupId(grp.id);
      setCreateOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data || 'Error creating or joining group';
      console.error('create/join error:', err?.response ?? err);
      setMessage(msg);
      pushToast(msg, 'error');
    }
  }

  async function handleJoin() {
    if (!currentUserId) return;
    setMessage(null);
    try {
      const grp = await joinGroup(inviteCode.trim(), joinUserId.trim() || currentUserId);
      setInviteCode('');
      setJoinUserId(currentUserId || '');
      const msg = 'Successfully joined group!';
      setMessage(msg);
      pushToast(msg, 'success');
      await reloadGroupsAndStay();
      setGroupId(grp.id);
      setJoinOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data || 'Error joining group';
      console.error('joinGroup failed:', err?.response ?? err);
      setMessage(msg);
      pushToast(msg, 'error');
    }
  }

  function selectGroup(grp: GroupResponse) {
    setGroupId(grp.id);
  }

  function enterGroup(grp: GroupResponse) {
    setGroupId(grp.id);
    navigate(`/dashboard/groups/${grp.id}/bets`);
  }

  async function copyInvite(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      const msg = 'Invite code copied to clipboard';
      setMessage(msg);
      pushToast(msg, 'success');
      setTimeout(() => setMessage(null), 2000);
    } catch {
      const msg = 'Could not copy invite code';
      setMessage(msg);
      pushToast(msg, 'error');
    }
  }

  /* Keyboard shortcuts */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isTyping) return;

      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key.toLowerCase() === 'n') {
        setCreateOpen(true);
      } else if (e.key.toLowerCase() === 'j') {
        setJoinOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* Filtered view (unchanged) */
  const filteredGroups = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    let arr = groups;
    if (q) {
      arr = arr.filter(g =>
        (g.name ?? "").toLowerCase().includes(q) ||
        (g.inviteCode ?? "").toLowerCase().includes(q)
      );
    }
    if (groupFilter !== 'all') {
      arr = arr;
    }
    return arr;
  }, [groups, searchQ, groupFilter]);

  /* Cards mapping (placeholders) */
  const gridCards: GroupCardProps[] = useMemo(() => {
    return filteredGroups.map(g => ({
      id: g.id,
      name: g.name,
      description: "",
      sportTag: undefined,
      membersCount: undefined,
      winRatePct: undefined,
      nextEventSummary: undefined,
      active: g.id === groupId,
    }));
  }, [filteredGroups, groupId]);

  /* ====== RENDER ====== */

  const mainColumn = (
    <>
      <div>
        <GroupsHeader
          totalGroups={groups.length}
          search={searchQ}
          onSearchChange={setSearchQ}
          filter={groupFilter}
          onFilterChange={v => setGroupFilter(v as 'all')}
          searchRef={searchRef}
          rightSlot={
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                type="button"
                size="md"
                className="fb-btn--field"
                onClick={() => setCreateOpen(true)}
              >
                New Group
              </Button>
              <Button
                type="button"
                size="md"
                variant="ghost"
                className="fb-btn--field"
                onClick={() => setJoinOpen(true)}
              >
                Join Group
              </Button>
            </div>
          }
        />
        {message && (
          <div style={{ margin: '6px 0 12px' }}>
            <Alert tone={message.toLowerCase().includes('error') || message.toLowerCase().includes('fail') ? 'error' : 'success'}>
              {message}
            </Alert>
          </div>
        )}
      </div>

      <SectionCard title="Browse your groups">
        {loadingGroups ? (
          <GroupsGridSkeleton count={6} />
        ) : gridCards.length === 0 ? (
          <EmptyState
            title="No groups match your search"
            text="Try clearing your filters or create a new group."
            actionText={searchQ ? "Clear search" : undefined}
            onAction={searchQ ? () => setSearchQ('') : undefined}
          />
        ) : (
          <GroupsGrid
            groups={gridCards}
            onSelect={id => {
              const g = groups.find(x => x.id === id);
              if (g) selectGroup(g);
            }}
            onOpen={id => {
              const g = groups.find(x => x.id === id);
              if (g) enterGroup(g);
            }}
          />
        )}
      </SectionCard>

      <SectionCard>
        {!selectedGroup ? (
          <div>Select a group from the grid or sidebar to view its details.</div>
        ) : (
          <>
            {/* Header row (actions removed to avoid redundancy) */}
            <header
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                marginBottom: 10,
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>{selectedGroup.name}</h3>

                {/* Meta row: invite pill + member count */}
                <div className="fb-meta-row">
                  <Tooltip label="Click to copy invite">
                    <span>
                      <CodePill
                        code={selectedGroup.inviteCode}
                        onCopy={() => copyInvite(selectedGroup.inviteCode)}
                      />
                    </span>
                  </Tooltip>

                  <span>{members.length} {members.length === 1 ? 'member' : 'members'}</span>
                  <span>•</span>
                  <span>Press <kbd>/</kbd> to search, <kbd>N</kbd> new, <kbd>J</kbd> join</span>
                </div>
              </div>
            </header>

            {/* Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Tabs
                value={detailTab}
                onChange={(k) => setDetailTab(k as 'overview' | 'members')}
                tabs={[
                  { key: 'overview', label: 'Overview' },
                  { key: 'members', label: `Members (${members.length})` },
                ]}
              />
            </div>

            {/* Tab content */}
            {detailTab === 'overview' ? (
              <div className="fb-overview fb-fade">
                <div className="fb-overview__stats">
                  <StatBadge label="Members" value={members.length} />
                  <StatBadge label="Your groups" value={groups.length} />
                  <StatBadge label="Active bets" value="—" />
                </div>

                <SectionCard title="Recent activity">
                  <ActivityList items={[]} loading={false} />
                </SectionCard>

                <TipsCard
                  inviteCode={selectedGroup.inviteCode}
                  membersCount={members.length}
                  onCopyInvite={() => copyInvite(selectedGroup.inviteCode)}
                  onOpenBets={() => enterGroup(selectedGroup)}
                />
              </div>
            ) : (
              <div className="fb-fade">
                <h4 style={{ marginTop: 0 }}>Members</h4>
                {loadingMembers ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <EmptyState title="Loading members…" text="" />
                  </div>
                ) : members.length === 0 ? (
                  <EmptyState title="No members yet" text="Invite your friends with the group code." />
                ) : (
                  <ul style={{ paddingLeft: 0, margin: 0, display: 'grid', gap: 8 }}>
                    {members.map(m => (
                      <li
                        key={m.id}
                        style={{
                          listStyle: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: 10,
                          background: '#fff',
                        }}
                      >
                        <Avatar name={m.username} />
                        <div style={{ display: 'grid' }}>
                          <span style={{ fontWeight: 600 }}>{m.username}</span>
                          <span style={{ fontSize: 12, color: '#64748b' }}>
                            joined {new Date(m.joinedAt).toLocaleString()}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </SectionCard>
    </>
  );

  const rightRail = (
    <RightRail>
      {/* Your Groups list */}
      <SectionCard title="Your Groups">
        {loadingGroups ? (
          <GroupListSkeleton rows={6} />
        ) : filteredGroups.length === 0 ? (
          <EmptyState
            title="No groups found"
            text={searchQ ? "No results for your search." : "Create or join a group to get started."}
            actionText={searchQ ? "Clear search" : undefined}
            onAction={searchQ ? () => setSearchQ('') : undefined}
          />
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {filteredGroups.map(g => {
              const active = g.id === groupId;
              return (
                <li key={g.id} style={{ marginBottom: 6 }}>
                  <Button
                    variant="ghost"
                    onClick={() => selectGroup(g)}
                    onDoubleClick={() => enterGroup(g)}
                    className="fb-btn--field"
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

      {/* Info cards */}
      <HowItWorksCard />
      <PopularSportsCard />
    </RightRail>
  );

  return (
    <>
      <TwoColumn main={mainColumn} right={rightRail} />

      {/* Create Group Modal */}
      <Modal
        open={createOpen}
        title="Create a new group"
        onClose={() => setCreateOpen(false)}
        footer={
          <Button
            type="button"
            size="md"
            className="fb-btn--field"
            onClick={handleCreate}
            disabled={!newName.trim() || !currentUserId}
            title={!currentUserId ? "Sign in to create groups" : undefined}
          >
            Create
          </Button>
        }
      >
        <FormField label="Group name" htmlFor="modal-new-group" helperText="Choose something recognizable to your friends.">
          <div className="fb-input-group">
            <Input
              id="modal-new-group"
              placeholder="New group name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              aria-label="New group name"
            />
            <Button
              type="button"
              size="md"
              variant="ghost"
              className="fb-btn--field"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </FormField>
      </Modal>

      {/* Join Group Modal */}
      <Modal
        open={joinOpen}
        title="Join a group by invite code"
        onClose={() => setJoinOpen(false)}
        footer={
          <Button
            type="button"
            size="md"
            className="fb-btn--field"
            onClick={handleJoin}
            disabled={!inviteCode.trim() || !currentUserId}
            title={!currentUserId ? "Sign in to join groups" : undefined}
          >
            Join
          </Button>
        }
      >
        <FormField label="Invite code" htmlFor="modal-invite-code" helperText="Paste the code you received from a friend.">
          <div className="fb-input-group">
            <Input
              id="modal-invite-code"
              placeholder="Invite Code"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              aria-label="Invite Code"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inviteCode.trim() && currentUserId) {
                  handleJoin();
                }
              }}
            />
            <Button
              type="button"
              size="md"
              variant="ghost"
              className="fb-btn--field"
              onClick={() => setJoinOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </FormField>

        <FormField label="Your user ID (optional)" htmlFor="modal-user-id" helperText="Pre-filled from your account. Change only if needed.">
          <Input
            id="modal-user-id"
            placeholder="Your User ID (optional)"
            value={joinUserId}
            onChange={e => setJoinUserId(e.target.value)}
            aria-label="User ID"
          />
        </FormField>
      </Modal>

      <ToastContainer items={toasts} onClose={closeToast} />
    </>
  );
}
