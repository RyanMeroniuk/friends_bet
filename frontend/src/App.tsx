// frontend/src/App.tsx

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';

import AuthPage from './Pages/AuthPage';
import MainPage from './Pages/MainPage';
import GroupPage from './Pages/GroupPage';
import WalletPage from './Pages/WalletPage';
import BetPage from './Pages/BetPage';
import { useAuth } from './context/AuthContext';

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading session…</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function PublicAuthRoute() {
  const { user, initializing } = useAuth();

  if (!initializing && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AuthPage />;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<PublicAuthRoute />} />

          <Route
            path="/dashboard/*"
            element={
              <RequireAuth>
                <MainPage />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="groups" replace />} />
            <Route path="groups" element={<GroupPage />} />
            <Route path="groups/:groupId/bets" element={<BetPage />} />

            {/* existing routes */}
            <Route path="wallets" element={<WalletPage />} />
            <Route path="bets" element={<BetPage />} />

            <Route path="*" element={<Navigate to="groups" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
