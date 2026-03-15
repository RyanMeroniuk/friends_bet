import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

// Mock the API modules
const mockRefreshSession = jest.fn();
const mockLoginUser = jest.fn();
const mockRegisterUser = jest.fn();
const mockLogoutUser = jest.fn();
const mockGetCurrentUser = jest.fn();

jest.mock('../api/user', () => ({
  refreshSession: (...args: any[]) => mockRefreshSession(...args),
  loginUser: (...args: any[]) => mockLoginUser(...args),
  registerUser: (...args: any[]) => mockRegisterUser(...args),
  logoutUser: (...args: any[]) => mockLogoutUser(...args),
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
}));

jest.mock('../api/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } } },
  setAxiosAccessToken: jest.fn(),
  registerAccessTokenListener: jest.fn(),
}));

// Helper component that exposes auth state for testing
function AuthConsumer({ onRender }: { onRender: (auth: ReturnType<typeof useAuth>) => void }) {
  const auth = useAuth();
  onRender(auth);
  return (
    <div>
      <span data-testid="user">{auth.user ? auth.user.username : 'null'}</span>
      <span data-testid="initializing">{String(auth.initializing)}</span>
    </div>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('initial_state_isLoggedOut', async () => {
  mockRefreshSession.mockRejectedValue(new Error('no session'));

  render(
    <AuthProvider>
      <AuthConsumer onRender={() => {}} />
    </AuthProvider>
  );

  await waitFor(() => {
    expect(screen.getByTestId('initializing').textContent).toBe('false');
  });

  expect(screen.getByTestId('user').textContent).toBe('null');
});

test('login_setsAuthState', async () => {
  mockRefreshSession.mockRejectedValue(new Error('no session'));
  mockLoginUser.mockResolvedValue({ accessToken: 'test-token' });
  mockGetCurrentUser.mockResolvedValue({
    id: '123', username: 'testuser', email: 'test@example.com', createdAt: '2024-01-01',
  });

  let authRef: ReturnType<typeof useAuth> | null = null;

  render(
    <AuthProvider>
      <AuthConsumer onRender={(auth) => { authRef = auth; }} />
    </AuthProvider>
  );

  // Wait for initialization to complete
  await waitFor(() => {
    expect(screen.getByTestId('initializing').textContent).toBe('false');
  });

  // Call login
  await act(async () => {
    await authRef!.login({ usernameOrEmail: 'testuser', password: 'password123' });
  });

  expect(screen.getByTestId('user').textContent).toBe('testuser');
  expect(mockLoginUser).toHaveBeenCalledWith({ usernameOrEmail: 'testuser', password: 'password123' });
});

test('login_failure_showsError', async () => {
  mockRefreshSession.mockRejectedValue(new Error('no session'));
  mockLoginUser.mockRejectedValue({ response: { status: 401, data: 'Invalid credentials' } });

  let authRef: ReturnType<typeof useAuth> | null = null;

  render(
    <AuthProvider>
      <AuthConsumer onRender={(auth) => { authRef = auth; }} />
    </AuthProvider>
  );

  await waitFor(() => {
    expect(screen.getByTestId('initializing').textContent).toBe('false');
  });

  await expect(
    act(async () => {
      await authRef!.login({ usernameOrEmail: 'testuser', password: 'wrong' });
    })
  ).rejects.toBeDefined();

  expect(screen.getByTestId('user').textContent).toBe('null');
});

test('logout_clearsState', async () => {
  // Start with a successful refresh (logged in)
  mockRefreshSession.mockResolvedValue({ accessToken: 'test-token' });
  mockGetCurrentUser.mockResolvedValue({
    id: '123', username: 'testuser', email: 'test@example.com', createdAt: '2024-01-01',
  });
  mockLogoutUser.mockResolvedValue(undefined);

  let authRef: ReturnType<typeof useAuth> | null = null;

  render(
    <AuthProvider>
      <AuthConsumer onRender={(auth) => { authRef = auth; }} />
    </AuthProvider>
  );

  await waitFor(() => {
    expect(screen.getByTestId('user').textContent).toBe('testuser');
  });

  // Call logout
  await act(async () => {
    await authRef!.logout();
  });

  expect(screen.getByTestId('user').textContent).toBe('null');
  expect(mockLogoutUser).toHaveBeenCalled();
});

test('refreshToken_onMount', async () => {
  mockRefreshSession.mockResolvedValue({ accessToken: 'refreshed-token' });
  mockGetCurrentUser.mockResolvedValue({
    id: '456', username: 'refresheduser', email: 'r@example.com', createdAt: '2024-01-01',
  });

  render(
    <AuthProvider>
      <AuthConsumer onRender={() => {}} />
    </AuthProvider>
  );

  await waitFor(() => {
    expect(screen.getByTestId('initializing').textContent).toBe('false');
  });

  expect(mockRefreshSession).toHaveBeenCalled();
  expect(screen.getByTestId('user').textContent).toBe('refresheduser');
});
