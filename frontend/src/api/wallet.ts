import api from './axios';

export interface WalletResponse {
  userId: string;
  balanceCents: number;
}

/** Get all balances for a group */
export async function listBalances(groupId: string): Promise<WalletResponse[]> {
  const resp = await api.get<WalletResponse[]>(`/api/groups/${groupId}/wallets`);
  return resp.data;
}

/** Deposit into a user’s wallet */
export async function deposit(
  groupId: string,
  userId: string,
  amountCents: number
): Promise<WalletResponse> {
  const resp = await api.post<WalletResponse>(
    `/api/groups/${groupId}/wallets/deposit`,
    { userId, amountCents }
  );
  return resp.data;
}

/**
 * fetch only the logged-in user’s balance for this group
 */
export async function getMyBalance(
  groupId: string,
  currentUserId: string
): Promise<number> {
  const all = await listBalances(groupId);
  const me = all.find(w => w.userId === currentUserId);
  return me ? me.balanceCents : 0;
}

/** Get total escrowed (pending) bet amount for current user in a group */
export async function getPendingBets(groupId: string): Promise<number> {
  const resp = await api.get<{ pendingCents: number }>(
    `/api/groups/${groupId}/wallets/pending`
  );
  return resp.data.pendingCents;
}

export interface WalletTransactionResponse {
  id: string;
  amountCents: number;
  balanceBefore: number;
  balanceAfter: number;
  transactionType: string;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
}

/** Get transaction history for the current user in a group */
export async function getTransactions(groupId: string): Promise<WalletTransactionResponse[]> {
  const resp = await api.get<WalletTransactionResponse[]>(
    `/api/groups/${groupId}/wallets/transactions`
  );
  return resp.data;
}
