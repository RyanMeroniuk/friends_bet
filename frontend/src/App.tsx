import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Button, Container } from '@mui/material';

import AuthPage from './pages/AuthPage';

function App() {
  return (
    <BrowserRouter>
      <AppBar position="static">
        <Toolbar>
          <Button color="inherit" component={Link} to="/auth">
            Sign In / Up
          </Button>
          <Button color="inherit" component={Link} to="/">
            Groups
          </Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
        </Routes>
      </Container>
    </BrowserRouter>
  );
}

export default App;
