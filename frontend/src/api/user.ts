import api from './axios';

export interface AuthResponse {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  token: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

/**
 * POST /api/users/register
 */
export async function registerUser(req: CreateUserRequest): Promise<AuthResponse> {
  const resp = await api.post<AuthResponse>('/api/users/register', req);
  return resp.data;
}

/**
 * POST /api/users/login
 */
export async function loginUser(req: LoginRequest): Promise<AuthResponse> {
  const resp = await api.post<AuthResponse>('/api/users/login', req);
  return resp.data;
}
