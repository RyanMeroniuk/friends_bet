import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AppBar, Toolbar, Button, Container } from '@mui/material';

import AuthPage from './pages/AuthPage';
import GroupPage from './pages/GroupPage';
import BetPage from './pages/BetPage';

function App() {
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
          <Button color="inherit" component={Link} to="/bets">
          Bets
          </Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/groups" element={<GroupPage />} />
          <Route path="/bets" element={<BetPage />} />
          <Route path="/" element={<Navigate to="/groups" replace />} />
        </Routes>
      </Container>
    </BrowserRouter>
  );
}

export default App;
