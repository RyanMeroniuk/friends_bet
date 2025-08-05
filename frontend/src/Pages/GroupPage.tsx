import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listMyGroups, createGroup, joinGroup, GroupResponse } from '../api/group';
import { useGroup } from '../context/GroupContext';

export default function GroupPage() {
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [newName, setNewName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinUserId, setJoinUserId] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const { setGroupId } = useGroup();
  const navigate = useNavigate();

  // 1) grab userId once
  const auth = JSON.parse(localStorage.getItem('authUser') || '{}');
  const currentUserId: string = auth.id;

  // Load only your groups when the page mounts
  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    try {
      setGroups(await listMyGroups(currentUserId));
    } catch (err) {
      console.error('Failed to load your groups', err);
      setMessage('Failed to load your groups');
    }
  }

  async function handleCreate() {
    console.log('▶️ handleCreate — creating group:', newName);
    try {
      const grp = await createGroup(newName);

      // auto-join yourself
      await joinGroup(grp.inviteCode, currentUserId);

      setNewName('');
      setMessage('Group created and you’ve joined it!');
      await loadGroups();

      // store in context
      setGroupId(grp.id);
    } catch (err: any) {
      console.error('handleCreate error:', err.response ?? err);
      setMessage(err.response?.data || 'Error creating or joining group');
    }
  }

  async function handleJoin() {
    setMessage(null);
    try {
      const grp = await joinGroup(inviteCode.trim(), joinUserId.trim());
      setMessage('Successfully joined group!');
      setInviteCode('');
      setJoinUserId('');
      await loadGroups();
      setGroupId(grp.id);
    } catch (err: any) {
      console.error('joinGroup failed:', err.response);
      setMessage(err.response?.data || 'Error joining group');
    }
  }

  function openGroup(grp: GroupResponse) {
    setGroupId(grp.id);
    navigate(`${grp.id}/bets`);
  }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto' }}>
      <h2>Your Groups</h2>
      {message && <p>{message}</p>}

      <div style={{ marginBottom: '1rem' }}>
        <input
          placeholder="New group name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <button type="button" onClick={handleCreate}>
          Create Group
        </button>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <input
          placeholder="Invite Code"
          value={inviteCode}
          onChange={e => setInviteCode(e.target.value)}
        />
        <input
          placeholder="Your User ID"
          value={joinUserId}
          onChange={e => setJoinUserId(e.target.value)}
        />
        <button type="button" onClick={handleJoin}>
          Join Group
        </button>
      </div>

      <ul>
        {groups.map(g => (
          <li
            key={g.id}
            style={{ cursor: 'pointer', marginBottom: '0.5rem' }}
            onClick={() => openGroup(g)}
          >
            <strong>{g.name}</strong> (Code: {g.inviteCode})
          </li>
        ))}
      </ul>
    </div>
  );
}
