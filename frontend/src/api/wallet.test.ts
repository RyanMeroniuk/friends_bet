import api from './axios';
import { deposit, listBalances } from './wallet';

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

test('deposit_postsCorrectPayload', async () => {
  const wallet = { userId: 'user-1', balanceCents: 5000 };
  (mockApi.post as jest.Mock).mockResolvedValue({ data: wallet });

  const result = await deposit('group-1', 'user-1', 5000);

  expect(mockApi.post).toHaveBeenCalledWith('/api/groups/group-1/wallets/deposit', {
    userId: 'user-1',
    amountCents: 5000,
  });
  expect(result).toEqual(wallet);
});

test('listBalances_sendsGetRequest', async () => {
  const wallets = [
    { userId: 'user-1', balanceCents: 3000 },
    { userId: 'user-2', balanceCents: 7000 },
  ];
  (mockApi.get as jest.Mock).mockResolvedValue({ data: wallets });

  const result = await listBalances('group-1');

  expect(mockApi.get).toHaveBeenCalledWith('/api/groups/group-1/wallets');
  expect(result).toHaveLength(2);
});
