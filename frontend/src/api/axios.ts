// src/api/axios.ts
import axios, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';

export type AuthAxiosRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
};

const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true,
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

api.interceptors.request.use((config: AuthAxiosRequestConfig) => {
  if (config.skipAuthRefresh) {
    return config;
  }

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
      skipAuthRefresh: true,
    } as AuthAxiosRequestConfig;
    refreshPromise = api
      .post<{ accessToken: string }>(
        '/api/users/refresh',
        {},
        config
      )
      .then((resp) => {
        const token = resp.data.accessToken;
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

    const isAuthEndpoint = requestConfig?.url?.includes('/api/users/login') ||
      requestConfig?.url?.includes('/api/users/refresh');

    if (
      response?.status === 401 &&
      requestConfig &&
      !requestConfig._retry &&
      !requestConfig.skipAuthRefresh &&
      !isAuthEndpoint
    ) {
      requestConfig._retry = true;
      try {
        const token = await requestNewAccessToken();
        if (!requestConfig.headers) {
          requestConfig.headers = AxiosHeaders.from({});
        } else if (!(requestConfig.headers instanceof AxiosHeaders)) {
          requestConfig.headers = AxiosHeaders.from(requestConfig.headers);
        }
        (requestConfig.headers as AxiosHeaders).set('Authorization', `Bearer ${token}`);
        return api(requestConfig);
      } catch (refreshError) {
        setAxiosAccessToken(null);
        emitToken(null);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
