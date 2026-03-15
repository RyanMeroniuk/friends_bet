import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';

jest.mock('../api/user', () => ({
  refreshSession: jest.fn().mockRejectedValue(new Error('no session')),
  loginUser: jest.fn(),
  registerUser: jest.fn(),
  logoutUser: jest.fn(),
  getCurrentUser: jest.fn(),
}));

jest.mock('../api/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } } },
  setAxiosAccessToken: jest.fn(),
  registerAccessTokenListener: jest.fn(),
}));

jest.mock('../resources/bet_logo.png', () => 'bet_logo.png');

import AuthPage from './AuthPage';

function renderAuthPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AuthPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('renders_registerForm', async () => {
  renderAuthPage();

  await waitFor(() => {
    expect(screen.getByText('Create your account')).toBeInTheDocument();
  });

  // Register mode: username, email, and password inputs by their IDs
  expect(document.getElementById('auth-username')).toBeInTheDocument();
  expect(document.getElementById('auth-email')).toBeInTheDocument();
  expect(document.getElementById('auth-password')).toBeInTheDocument();
});

test('renders_loginForm', async () => {
  renderAuthPage();

  await waitFor(() => {
    expect(screen.getByText('Create your account')).toBeInTheDocument();
  });

  // Switch to login tab
  const loginTab = screen.getByRole('tab', { name: /login/i });
  userEvent.click(loginTab);

  await waitFor(() => {
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  // Login mode: username/email field and password, but NOT a separate email field
  expect(document.getElementById('auth-username')).toBeInTheDocument();
  expect(document.getElementById('auth-email')).not.toBeInTheDocument();
  expect(document.getElementById('auth-password')).toBeInTheDocument();
});

test('submit_showsValidationError_whenEmpty', async () => {
  renderAuthPage();

  await waitFor(() => {
    expect(screen.getByText('Create your account')).toBeInTheDocument();
  });

  // Switch to login and submit empty form
  const loginTab = screen.getByRole('tab', { name: /login/i });
  userEvent.click(loginTab);

  await waitFor(() => {
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  // Click submit with empty fields
  const submitBtn = screen.getByRole('button', { name: /log in/i });
  userEvent.click(submitBtn);

  await waitFor(() => {
    // Both an error surface and a toast may appear with role="status"
    expect(screen.getAllByRole('status').length).toBeGreaterThanOrEqual(1);
  });
});
