import api from './axios';

export interface GameOdds {
  h2h?: { home?: number; away?: number }; // moneyline, decimal odds
  spreads?: {
    lineHome?: number;
    lineAway?: number;
    oddsHome?: number;
    oddsAway?: number;
  };
  totals?: {
    line?: number;
    over?: number;
    under?: number;
  };
}

export interface GameSummary {
  id: string;
  externalGameId?: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  odds?: GameOdds;
}

export async function listGames(params?: {
  sport?: string;
  from?: string;
  to?: string;
}): Promise<GameSummary[]> {
  const resp = await api.get<GameSummary[]>('/api/games', { params });
  return resp.data;
}
