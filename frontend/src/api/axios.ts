// src/api/axios.ts
import axios, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';

export type AuthAxiosRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
};

const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true, // required to send the HttpOnly refresh cookie
});

let accessToken: string | null = null;
let tokenListener: ((token: string | null) => void) | null = null;
let refreshPromise: Promise<string> | null = null;

export function setAxiosAccessToken(token: string | null) {
  accessToken = token;
}

export function registerAccessTokenListener(listener: (token: string | null) => void) {
  tokenListener = listener;
}

function emitToken(token: string | null) {
  tokenListener?.(token);
}

// Attach Authorization for normal requests (not for refresh)
api.interceptors.request.use((config: AuthAxiosRequestConfig) => {
  if (config.skipAuthRefresh) return config;

  if (accessToken) {
    if (!config.headers) {
      config.headers = AxiosHeaders.from({});
    } else if (!(config.headers instanceof AxiosHeaders)) {
      config.headers = AxiosHeaders.from(config.headers);
    }
    const headers = config.headers as AxiosHeaders;
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
  }
  return config;
});

async function requestNewAccessToken(): Promise<string> {
  if (!refreshPromise) {
    const config = {
      skipAuthRefresh: true, // don't attach stale Authorization on refresh call
    } as AuthAxiosRequestConfig;

    refreshPromise = api
      .post<{ accessToken: string }>('/api/users/refresh', {}, config)
      .then((resp) => {
        const token = resp.data?.accessToken;
        if (!token) throw new Error('Refresh returned no accessToken');
        setAxiosAccessToken(token);
        emitToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const { response, config } = error;
    const requestConfig = config as AuthAxiosRequestConfig | undefined;

    // No config (very rare) -> just bubble
    if (!requestConfig) return Promise.reject(error);

    const url = (requestConfig.url ?? '').toString();
    const status = response?.status;
    const isAuthEndpoint =
      url.includes('/api/users/login') ||
      url.includes('/api/users/refresh') ||
      url.includes('/api/users/logout');

    // Heuristic: treat certain 403s like auth failures to trigger refresh
    // (belt & suspenders in case the server still returns 403 for expired tokens)
    const body: any = response?.data;
    const bodyStr =
      typeof body === 'string' ? body : body ? JSON.stringify(body) : '';
    const looksAuth403 =
      status === 403 &&
      /unauth|auth|token|expired|jwt|not\s*authenticated/i.test(bodyStr);

    const shouldAttemptRefresh =
      !requestConfig._retry &&
      !requestConfig.skipAuthRefresh &&
      !isAuthEndpoint &&
      (status === 401 || looksAuth403);

    if (shouldAttemptRefresh) {
      requestConfig._retry = true;
      try {
        const token = await requestNewAccessToken();

        // Ensure the retried request carries the fresh token
        if (!requestConfig.headers) {
          requestConfig.headers = AxiosHeaders.from({});
        } else if (!(requestConfig.headers instanceof AxiosHeaders)) {
          requestConfig.headers = AxiosHeaders.from(requestConfig.headers);
        }
        (requestConfig.headers as AxiosHeaders).set('Authorization', `Bearer ${token}`);

        return api(requestConfig);
      } catch (refreshError) {
        // Refresh failed: clear token and bubble up (UI should route to login)
        setAxiosAccessToken(null);
        emitToken(null);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
