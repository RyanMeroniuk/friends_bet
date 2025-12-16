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


      <AppBar
        position="fixed"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
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
          <Typography variant="h5" sx={{ mr: 2, flexShrink: 0, fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(45deg, #2563eb, #06b6d4)', backgroundClip: 'text', textFillColor: 'transparent', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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
            <Box sx={{ textAlign: 'right', mr: 2, display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {user.username}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {user.email}
              </Typography>
            </Box>

            {/* Actions — always visible */}
            <Button
              variant="outlined"
              size="small"
              onClick={copyId}
              sx={{
                borderColor: 'divider',
                color: 'text.primary',
                '&:hover': { borderColor: 'primary.main', background: 'transparent' },
                flexShrink: 0,
              }}
            >
              Copy ID
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleLogout}
              color="primary"
              sx={{
                flexShrink: 0,
                boxShadow: 'none',
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
        <List sx={{ px: 2 }}>
          <ListItemButton component={Link} to="/dashboard/groups" sx={{ borderRadius: 2, mb: 1 }}>
            <ListItemText primary="Groups" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
          <ListItemButton component={Link} to="/dashboard/wallets" sx={{ borderRadius: 2, mb: 1 }}>
            <ListItemText primary="Wallets" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
          <ListItemButton component={Link} to="/dashboard/bets" sx={{ borderRadius: 2, mb: 1 }}>
            <ListItemText primary="Bets" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
