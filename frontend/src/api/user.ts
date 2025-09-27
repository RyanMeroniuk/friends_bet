import api, { AuthAxiosRequestConfig } from './axios';

export interface AccessTokenResponse {
  accessToken: string;
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

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export async function registerUser(req: CreateUserRequest): Promise<AccessTokenResponse> {
  const resp = await api.post<AccessTokenResponse>('/api/users/register', req);
  return resp.data;
}

export async function loginUser(req: LoginRequest): Promise<AccessTokenResponse> {
  const resp = await api.post<AccessTokenResponse>('/api/users/login', req);
  return resp.data;
}

export async function refreshSession(): Promise<AccessTokenResponse> {
  const config = { skipAuthRefresh: true } as AuthAxiosRequestConfig;
  const resp = await api.post<AccessTokenResponse>('/api/users/refresh', {}, config);
  return resp.data;
}

export async function logoutUser(): Promise<void> {
  const config = { skipAuthRefresh: true } as AuthAxiosRequestConfig;
  await api.post('/api/users/logout', {}, config);
}

export async function getCurrentUser(): Promise<UserProfile> {
  const resp = await api.get<UserProfile>('/api/users/me');
  return resp.data;
}
