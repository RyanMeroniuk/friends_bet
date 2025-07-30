import api from './axios';

export interface WalletResponse {
  userId: string;
  balanceCents: number;
}

/**
 * GET /api/groups/{groupId}/wallets
 */
export async function listBalances(groupId: string): Promise<WalletResponse[]> {
  const resp = await axios.get<WalletResponse[]>(`/api/groups/${groupId}/wallets`);
  return resp.data;
}

/**
 * POST /api/groups/{groupId}/wallets/deposit
 */
export async function deposit(
  groupId: string,
  userId: string,
  amountCents: number
): Promise<WalletResponse> {
  const resp = await axios.post<WalletResponse>(
    `/api/groups/${groupId}/wallets/deposit`,
    { userId, amountCents }
  );
  return resp.data;
}
