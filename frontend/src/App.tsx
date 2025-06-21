import React, { useEffect, useState } from 'react';
import { ping } from './api/ping';
import { Container, Typography, CircularProgress } from '@mui/material';

function App() {
  const [pong, setPong] = useState<string | null>(null);

  useEffect(() => {
    ping()
      .then((data) => setPong(data))
      .catch((err) => setPong('Error'));
  }, []);

  return (
    <Container style={{ marginTop: 40, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        FriendsBet Front-End
      </Typography>
      {pong === null ? (
        <CircularProgress />
      ) : (
        <Typography variant="h6">Backend says: {pong}</Typography>
      )}
    </Container>
  );
}

export default App;
