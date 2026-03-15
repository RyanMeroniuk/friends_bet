import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { GroupProvider } from '../context/GroupContext';

const mockListMyGroups = jest.fn();
const mockListGroupMembers = jest.fn();
const mockRefreshSession = jest.fn();
const mockGetCurrentUser = jest.fn();

jest.mock('../api/user', () => ({
  refreshSession: (...args: any[]) => mockRefreshSession(...args),
  loginUser: jest.fn(),
  registerUser: jest.fn(),
  logoutUser: jest.fn(),
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
}));

jest.mock('../api/group', () => ({
  listMyGroups: (...args: any[]) => mockListMyGroups(...args),
  createGroup: jest.fn(),
  joinGroup: jest.fn(),
  listGroupMembers: (...args: any[]) => mockListGroupMembers(...args),
}));

jest.mock('../api/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } } },
  setAxiosAccessToken: jest.fn(),
  registerAccessTokenListener: jest.fn(),
}));

jest.mock('../resources/bet_logo.png', () => 'bet_logo.png');

import GroupPage from './GroupPage';

function renderGroupPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <GroupProvider>
          <GroupPage />
        </GroupProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRefreshSession.mockResolvedValue({ accessToken: 'test-token' });
  mockGetCurrentUser.mockResolvedValue({
    id: 'user-1', username: 'testuser', email: 'test@example.com', createdAt: '2024-01-01',
  });
  mockListMyGroups.mockResolvedValue([]);
  mockListGroupMembers.mockResolvedValue([]);
});

test('renders_groupPage', async () => {
  await act(async () => {
    renderGroupPage();
  });

  await waitFor(() => {
    expect(mockListMyGroups).toHaveBeenCalledWith('user-1');
  }, { timeout: 3000 });
});

test('renders_groupList_withGroups', async () => {
  mockListMyGroups.mockResolvedValue([
    { id: 'g1', name: 'Fantasy League', inviteCode: 'ABC', createdAt: '2024-01-01' },
    { id: 'g2', name: 'Work Bets', inviteCode: 'XYZ', createdAt: '2024-01-01' },
  ]);

  await act(async () => {
    renderGroupPage();
  });

  await waitFor(() => {
    expect(screen.getAllByText('Fantasy League').length).toBeGreaterThanOrEqual(1);
  }, { timeout: 3000 });

  expect(screen.getAllByText('Work Bets').length).toBeGreaterThanOrEqual(1);
});
