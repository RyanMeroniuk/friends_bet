import api from './axios';

export type GameLite = {
  id: string;
  externalGameId: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
};

export async function listGames(): Promise<GameLite[]> {
  const { data } = await api.get<GameLite[]>('/api/odds/games');
  return data;
}

export async function quotesForGame(gameId: string) {
  const { data } = await api.get(`/api/odds/games/${gameId}/quotes`);
  return data;
}
