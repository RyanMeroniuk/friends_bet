import api from './axios';

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
  odds: number
): Promise<Bet> {
  const resp = await api.post<Bet>(
    `/api/groups/${groupId}/bets`,
    { proposerId, gameId, marketType, pick, amountCents, odds }
  );
  return resp.data;
}

export async function acceptBet(betId: string, acceptorId: string): Promise<Bet> {
  const resp = await api.post<Bet>(
    `/api/bets/${betId}/accept`,
    { acceptorId }
  );
  return resp.data;
}
