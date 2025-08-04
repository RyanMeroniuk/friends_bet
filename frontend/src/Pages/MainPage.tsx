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

interface AuthUser {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  token: string;
}

export default function MainPage() {
  const stored = localStorage.getItem('authUser');
  const user: AuthUser = stored ? JSON.parse(stored) : null!;
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!stored) navigate('/auth');
  }, [stored, navigate]);

  const logout = () => {
    localStorage.removeItem('authUser');
    navigate('/auth');
  };

  const drawerWidth = 240;

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Top AppBar */}
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
          <button onClick={logout}>Logout</button>
        </Toolbar>
      </AppBar>

      {/* Side Drawer */}
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

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Toolbar />
        {/* Renders the matching nested route */}
        <Outlet />
      </Box>
    </Box>
  );
}
