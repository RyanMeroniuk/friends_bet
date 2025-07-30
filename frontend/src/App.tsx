// frontend/src/App.tsx

import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AppBar, Toolbar, Button, Container } from '@mui/material';
import { useGroup } from './context/GroupContext';

import AuthPage from './pages/AuthPage';
import GroupPage from './pages/GroupPage';
import BetPage from './pages/BetPage';
import WalletPage from './pages/WalletPage';

function App() {
  const { groupId } = useGroup();

  return (
    <BrowserRouter>
      <AppBar position="static">
        <Toolbar>
          <Button color="inherit" component={Link} to="/auth">
            Sign In / Up
          </Button>
          <Button color="inherit" component={Link} to="/groups">
            Groups
          </Button>
          {/* Only enable these when a group is selected */}
          <Button
            color="inherit"
            component={Link}
            to={groupId ? `/groups/${groupId}/bets` : '#'}
            disabled={!groupId}
          >
            Bets
          </Button>
          <Button
            color="inherit"
            component={Link}
            to={groupId ? `/groups/${groupId}/wallets` : '#'}
            disabled={!groupId}
          >
            Wallets
          </Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/groups" element={<GroupPage />} />
          <Route path="/groups/:groupId/bets"    element={<BetPage />} />
          <Route path="/groups/:groupId/wallets" element={<WalletPage />} />
          <Route path="/" element={<Navigate to="/groups" replace />} />
        </Routes>
      </Container>
    </BrowserRouter>
  );
}

export default App;
