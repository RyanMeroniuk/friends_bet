import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listGroups, createGroup, joinGroup, GroupResponse } from '../api/group';
import { useGroup } from '../context/GroupContext';

export default function GroupPage() {
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [newName, setNewName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinUserId, setJoinUserId] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const { setGroupId } = useGroup();
  const navigate = useNavigate();

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
      console.log("we are in the function")
    try {
      const grp = await createGroup(newName);
      setNewName('');
      setMessage('Group created');
      loadGroups();
      // automatically navigate into new group
      setGroupId(grp.id);
    } catch (err: any) {
      setMessage(err.response?.data || 'Error creating group');
    }
  }

  async function handleJoin() {
    // 1) Clear any prior message
    setMessage(null);

    const code = inviteCode.trim();
    const uId  = joinUserId.trim();
    console.log('Joining group', code, uId);

    try {
      // 2) Call the API
      const grp = await joinGroup(code, uId);

      // 3) Show a success message (or navigate away)
      setMessage('Successfully joined group!');

      // 4) Clear the form
      setInviteCode('');
      setJoinUserId('');

      // 5) Refresh your list of groups
      await loadGroups();

      // (Optional) Immediately enter that group:
      setGroupId(grp.id);
      navigate(`/groups/${grp.id}/bets`);
    } catch (err: any) {
      // 6) On error, show the real message
      console.error('joinGroup failed response:', err.response);
      setMessage(err.response?.data || 'Error joining group');
    }
  }


  function openGroup(grp: GroupResponse) {
    setGroupId(grp.id);
    navigate(`/groups/${grp.id}/bets`);
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
