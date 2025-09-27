import api from './axios';

interface RefreshResponse { status: string; refreshed: string; }

export interface Bet {
  id: string;
  proposerId: string;
  acceptorId: string | null;
  gameId: string;
  marketType: string;
  pick: string;
  amountCents: number;
  odds: number;
  status: string;
  details?: Record<string, any>;
  acceptorStakeCents?: number;
}

export async function listBets(groupId: string): Promise<Bet[]> {
  const resp = await api.get<Bet[]>(`/api/groups/${groupId}/bets`);
  return resp.data;
}

export async function proposeBet(
  groupId: string,
  proposerId: string,
  gameId: string,
  marketType: string,
  pick: string,
  amountCents: number,
  odds: number,
  details?: Record<string, any>
): Promise<Bet> {
  const payload: any = { proposerId, gameId, marketType, pick, amountCents, odds };
  if (details) payload.details = details;

  const resp = await api.post<Bet>(`/api/groups/${groupId}/bets`, payload);
  return resp.data;
}

export async function acceptBet(betId: string, acceptorId: string): Promise<Bet> {
  const resp = await api.post<Bet>(`/api/bets/${betId}/accept`, { acceptorId });
  return resp.data;
}

function authConfig() {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  const adminSecret = process.env.REACT_APP_ADMIN_SECRET;
  if (adminSecret) headers['X-Admin-Secret'] = adminSecret;

  return { headers };
}

export async function refreshSports(sport?: string): Promise<RefreshResponse> {
  const config = { ...authConfig(), params: { sport: sport ?? 'all' } };
  const resp = await api.post<RefreshResponse>(`/api/admin/refresh`, {}, config);
  return resp.data;
}

export async function settleAcceptedBets(groupId: string): Promise<{ settled: number }> {
  const resp = await api.post<{ settled: number }>(
    `/api/groups/${groupId}/bets/settle-accepted`,
    {},
    authConfig()
  );
  return resp.data;
}
