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
import '../styles/ui.css';

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
      /* ignore */
    }
  };

  if (!user) {
    return <div style={{ padding: '2rem' }}>Loading user…</div>;
  }

  const drawerWidth = 240;

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        elevation={1}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'var(--fb-cl-navy)',
          color: '#fff',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 2px 10px rgba(1,50,55,0.15)',
        }}
      >
        <Toolbar sx={{ minHeight: 64 }}>
          {/* Left: Brand/title */}
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            FriendsBet
          </Typography>

          {/* Push everything else to the right */}
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1" sx={{ opacity: 0.95 }}>
              {user.username}
            </Typography>

            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              ({user.email})
            </Typography>

            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              ID: <code>{user.id}</code>
            </Typography>

            <button
              onClick={copyId}
              className="fb-btn fb-btn--ghost fb-btn--sm"
              title="Copy your user ID"
            >
              Copy ID
            </button>

            <button
              onClick={handleLogout}
              className="fb-btn fb-btn--ghost fb-btn--sm"
              title="Sign out"
            >
              Logout
            </button>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
            mt: 8,
            backgroundColor: '#EFD8CD',     // darker than cream
            borderRight: '1px solid #E6C6BA',
          },

          '& .MuiListItemButton-root': {
            borderRadius: '10px',
            margin: '4px 8px',
            color: '#013237',                // deep navy/teal
            '&:hover': {
              backgroundColor: 'rgba(254, 151, 156, 0.18)', // a touch stronger on darker bg
            },
            '&.Mui-selected, &.Mui-selected:hover': {
              backgroundColor: 'rgba(254, 151, 156, 0.28)',
            },
          },
          '& .MuiListItemText-primary': { fontWeight: 600 },
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
