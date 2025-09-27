// frontend/src/Pages/MainPage.tsx
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
  GlobalStyles,
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
    try { await navigator.clipboard.writeText(user.id); } catch {}
  };

  if (!user) return <div style={{ padding: '2rem' }}>Loading user…</div>;

  const drawerWidth = 240;

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Force the left drawer background no matter what the theme does */}
      <GlobalStyles
        styles={{
          '.MuiDrawer-paper': {
            backgroundColor: 'var(--fb-bg, #f7f8fb) !important',
            backgroundImage: 'none !important',
            boxSizing: 'border-box',
            borderRight: '1px solid var(--fb-border)',
          },
        }}
      />

      <AppBar
        position="fixed"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          backgroundColor: 'var(--fb-deep)', // top bar color from your CSS vars
        }}
      >
        <Toolbar sx={{ width: '100%' }}>
          <Typography variant="h6" sx={{ mr: 2 }}>
            FriendsBet
          </Typography>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Typography variant="body1" sx={{ ml: 2 }}>
              {user.username}
            </Typography>
            <Typography variant="body2" sx={{ mx: 2 }}>
              ({user.email})
            </Typography>
            <Typography variant="body2" sx={{ mr: 1 }}>
              ID: <code>{user.id}</code>
            </Typography>
            <button onClick={copyId} style={{ marginRight: 12 }}>Copy ID</button>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            mt: 8, // below app bar
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
