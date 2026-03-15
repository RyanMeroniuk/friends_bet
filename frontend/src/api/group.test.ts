import api from './axios';
import { createGroup, listGroups, joinGroup } from './group';

jest.mock('./axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  },
  setAxiosAccessToken: jest.fn(),
  registerAccessTokenListener: jest.fn(),
}));

const mockApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.clearAllMocks();
});

test('createGroup_postsCorrectPayload', async () => {
  const group = { id: '1', name: 'Test Group', inviteCode: 'ABC123', createdAt: '2024-01-01' };
  (mockApi.post as jest.Mock).mockResolvedValue({ data: group });

  const result = await createGroup('Test Group');

  expect(mockApi.post).toHaveBeenCalledWith('/api/groups', { name: 'Test Group' });
  expect(result).toEqual(group);
});

test('listGroups_sendsGetRequest', async () => {
  const groups = [
    { id: '1', name: 'Group 1', inviteCode: 'A', createdAt: '2024-01-01' },
    { id: '2', name: 'Group 2', inviteCode: 'B', createdAt: '2024-01-01' },
  ];
  (mockApi.get as jest.Mock).mockResolvedValue({ data: groups });

  const result = await listGroups();

  expect(mockApi.get).toHaveBeenCalledWith('/api/groups');
  expect(result).toHaveLength(2);
});

test('joinGroup_postsWithInviteCode', async () => {
  const group = { id: '1', name: 'Joined Group', inviteCode: 'XYZ', createdAt: '2024-01-01' };
  (mockApi.post as jest.Mock).mockResolvedValue({ data: group });

  const result = await joinGroup('XYZ', 'user-123');

  expect(mockApi.post).toHaveBeenCalledWith('/api/groups/XYZ/join', { userId: 'user-123' });
  expect(result).toEqual(group);
});
