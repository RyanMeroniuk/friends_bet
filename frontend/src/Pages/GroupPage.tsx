import React, { useEffect, useState } from 'react';
import { listGroups, createGroup, joinGroup, GroupResponse } from '../api/group';

export default function GroupPage() {
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [newName, setNewName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinUserId, setJoinUserId] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  // Load groups when the page mounts
  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    try {
      setGroups(await listGroups());
    } catch (err) {
      console.error(err);
      setMessage('Failed to load groups');
    }
  }

  async function handleCreate() {
    try {
      await createGroup(newName);
      setNewName('');
      setMessage('Group created');
      loadGroups();
    } catch (err: any) {
      setMessage(err.response?.data || 'Error creating group');
    }
  }

  async function handleJoin() {
    try {
      await joinGroup(inviteCode, joinUserId);
      setInviteCode('');
      setJoinUserId('');
      setMessage('Joined group');
      loadGroups();
    } catch (err: any) {
      setMessage(err.response?.data || 'Error joining group');
    }
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
        <button onClick={handleCreate}>Create Group</button>
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
        <button onClick={handleJoin}>Join Group</button>
      </div>

      <ul>
        {groups.map(g => (
          <li key={g.id}>
            <strong>{g.name}</strong> (Code: {g.inviteCode})
          </li>
        ))}
      </ul>
    </div>
  );
}
