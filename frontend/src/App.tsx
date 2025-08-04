// frontend/src/App.tsx

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AuthPage   from './pages/AuthPage';
import MainPage   from './pages/MainPage';
import GroupPage  from './pages/GroupPage';
import WalletPage from './pages/WalletPage';
import BetPage    from './pages/BetPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1) Public auth */}
        <Route path="/auth" element={<AuthPage />} />

        {/* 2) Dashboard layout with nested routes */}
        <Route path="/dashboard/*" element={<MainPage />}>
          {/* Redirect /dashboard → /dashboard/groups */}
          <Route index element={<Navigate to="groups" replace />} />

          {/* These will render inside <Outlet /> of MainPage */}
          <Route path="groups"  element={<GroupPage  />} />
          <Route path="wallets" element={<WalletPage />} />
          <Route path="bets"    element={<BetPage    />} />

          {/* Any other /dashboard/... → back to groups */}
          <Route path="*" element={<Navigate to="groups" replace />} />
        </Route>

        {/* 3) Everything else → /auth */}
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
