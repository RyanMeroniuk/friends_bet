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
  Button,
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
      {/* Keep drawer background consistent */}
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
          backgroundColor: 'var(--fb-deep)',
        }}
      >
        <Toolbar
          sx={{
            width: '100%',
            gap: 0.75,
            minHeight: { xs: 56, sm: 64 },
            pl: { xs: 1, sm: 2 },
            pr: { xs: 1.75, sm: 2.75 }, // keep right cluster in view with slight inset
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h6" sx={{ mr: 2, flexShrink: 0 }}>
            BigStu Bets
          </Typography>

          {/* Right cluster — anchored right with slight inset so buttons stay visible */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,                 // tighter gap
              minWidth: 0,
              maxWidth: { xs: '70vw', sm: '60vw', md: '50vw' }, // guard against overflow
              overflow: 'hidden',
              mr: { xs: 1.5, sm: 2.5 }, // keep cluster away from screen edge
            }}
          >
            <Typography
              variant="body1"
              noWrap
              sx={{ maxWidth: { xs: 100, sm: 150, md: 200 }, minWidth: 0 }}
              title={user.username}
            >
              {user.username}
            </Typography>
            <Typography
              variant="body2"
              noWrap
              sx={{ opacity: 0.9, maxWidth: { xs: 140, sm: 180, md: 240 }, minWidth: 0 }}
              title={user.email}
            >
              ({user.email})
            </Typography>

            {/* Actions — always visible */}
            <Button
              variant="outlined"
              size="small"
              onClick={copyId}
              sx={{
                borderColor: 'rgba(255,255,255,0.35)',
                color: 'var(--fb-primary-contrast)',
                '&:hover': { borderColor: 'rgba(255,255,255,0.6)' },
                flexShrink: 0,
              }}
            >
              Copy ID
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleLogout}
              sx={{
                color: 'var(--fb-primary-contrast)',
                backgroundColor: 'rgba(255,255,255,0.16)',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.22)' },
                flexShrink: 0,
              }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            mt: { xs: 7, sm: 8 }, // below app bar
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
