import api from './axios';
import { registerUser, loginUser, getCurrentUser } from './user';

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

test('registerUser_postsCorrectPayload', async () => {
  (mockApi.post as jest.Mock).mockResolvedValue({ data: { accessToken: 'token-123' } });

  const result = await registerUser({ username: 'newuser', email: 'new@example.com', password: 'password123' });

  expect(mockApi.post).toHaveBeenCalledWith('/api/users/register', {
    username: 'newuser',
    email: 'new@example.com',
    password: 'password123',
  });
  expect(result.accessToken).toBe('token-123');
});

test('loginUser_postsCorrectPayload', async () => {
  (mockApi.post as jest.Mock).mockResolvedValue({ data: { accessToken: 'token-456' } });

  const result = await loginUser({ usernameOrEmail: 'testuser', password: 'mypassword' });

  expect(mockApi.post).toHaveBeenCalledWith('/api/users/login', {
    usernameOrEmail: 'testuser',
    password: 'mypassword',
  });
  expect(result.accessToken).toBe('token-456');
});

test('getProfile_sendsGetRequest', async () => {
  const profile = { id: '1', username: 'testuser', email: 'test@example.com', createdAt: '2024-01-01' };
  (mockApi.get as jest.Mock).mockResolvedValue({ data: profile });

  const result = await getCurrentUser();

  expect(mockApi.get).toHaveBeenCalledWith('/api/users/me');
  expect(result).toEqual(profile);
});
