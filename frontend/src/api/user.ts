import axios from 'axios';

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
 * Sends a user registration request to the backend.
 * @param req { username, email, password }
 * @returns the AuthResponse containing user info and a token
 */
export async function registerUser(req: CreateUserRequest): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>('/api/users/register', req);
  return response.data;
}

/**
 * Sends a user login request to the backend.
 * @param req { usernameOrEmail, password }
 * @returns the AuthResponse containing user info and a token
 */
export async function loginUser(req: LoginRequest): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>('/api/users/login', req);
  return response.data;
}
