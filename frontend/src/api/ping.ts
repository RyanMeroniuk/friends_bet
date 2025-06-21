import axios from 'axios';

export async function ping(): Promise<string> {
  const response = await axios.get<string>('/ping');
  return response.data;
}
