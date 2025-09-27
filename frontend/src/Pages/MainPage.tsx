// frontend/src/pages/MainPage.tsx

import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  AppBar,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

export default function MainPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const copyId = async () => {
    if (!user?.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
    } catch {
      // ignore copy failures
    }
  };

  if (!user) {
    return <div style={{ padding: '2rem' }}>Loading user…</div>;
  }

  const drawerWidth = 240;

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            FriendsBet
          </Typography>

          <Typography variant="body1" sx={{ mr: 2 }}>
            {user.username}
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            ({user.email})
          </Typography>
          <Typography variant="body2" sx={{ mr: 1 }}>
            ID: <code>{user.id}</code>
          </Typography>
          <button onClick={copyId} style={{ marginRight: 12 }}>Copy ID</button>

          <button onClick={handleLogout}>Logout</button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            mt: 8,
          },
        }}
      >
        <List>
          <ListItemButton component={Link} to="/dashboard/groups">
            <ListItemText primary="Groups" />
          </ListItemButton>
          <ListItemButton component={Link} to="/dashboard/wallets">
            <ListItemText primary="Wallets" />
          </ListItemButton>
          <ListItemButton component={Link} to="/dashboard/bets">
            <ListItemText primary="Bets" />
          </ListItemButton>
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
