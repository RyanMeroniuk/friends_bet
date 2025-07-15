import React from 'react';
import { registerUser } from './api/user';

function App() {
  const onTestRegister = async () => {
    try {
      const resp = await registerUser({
        username: 'test1',
        email: 'test1@example.com',
        password: 'Password123'
      });
      console.log('Register response:', resp);
      alert(`Registered: ${resp.username} (${resp.email})\nToken: ${resp.token}`);
    } catch (err: any) {
      console.error(err);
      alert('Error: ' + (err.response?.data || err.message));
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>FriendsBet Front-End</h1>
      <button onClick={onTestRegister}>Test User Registration</button>
    </div>
  );
}

export default App;
