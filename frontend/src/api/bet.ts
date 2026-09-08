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

export async function refreshSports(sport?: string): Promise<RefreshResponse> {
  const resp = await api.post<RefreshResponse>(
    `/api/games/refresh`,
    {},
    { params: { sport: sport ?? 'all' } }
  );
  return resp.data;
}

export async function cancelBet(betId: string): Promise<Bet> {
  const resp = await api.post<Bet>(`/api/bets/${betId}/cancel`);
  return resp.data;
}

export async function settleAcceptedBets(groupId: string): Promise<{ settled: number }> {
  const resp = await api.post<{ settled: number }>(
    `/api/groups/${groupId}/bets/settle-accepted`,
    {}
  );
  return resp.data;
}
