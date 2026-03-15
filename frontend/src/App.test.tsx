import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { GroupProvider } from './context/GroupContext';

// Mock all API calls that AuthProvider triggers on mount
jest.mock('./api/user', () => ({
  refreshSession: jest.fn().mockRejectedValue(new Error('no session')),
  loginUser: jest.fn(),
  registerUser: jest.fn(),
  logoutUser: jest.fn(),
  getCurrentUser: jest.fn(),
}));

jest.mock('./api/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } } },
  setAxiosAccessToken: jest.fn(),
  registerAccessTokenListener: jest.fn(),
}));

// App imports image assets
jest.mock('./resources/bet_logo.png', () => 'bet_logo.png');

test('renders without crashing', async () => {
  render(
    <AuthProvider>
      <GroupProvider>
        <App />
      </GroupProvider>
    </AuthProvider>
  );

  // AuthProvider calls refreshSession on mount, which rejects → redirects to /auth
  await waitFor(() => {
    expect(screen.getByText(/BigStu Bets/i)).toBeInTheDocument();
  });
});
