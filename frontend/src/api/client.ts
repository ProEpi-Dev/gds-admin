import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshTokensPromise: Promise<{ token: string; refreshToken: string }> | null =
  null;

function clearSessionAndMaybeRedirect() {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  const publicRoutes = ['/login', '/signup', '/setup', '/verify-email', '/email-verified'];
  const currentPath = window.location.pathname;
  const isPublicRoute = publicRoutes.some((route) =>
    currentPath.startsWith(route),
  );
  if (!isPublicRoute) {
    window.location.href = '/login';
  }
}

function shouldSkipRefreshForUrl(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.includes('auth/refresh') ||
    url.includes('auth/login') ||
    url.includes('auth/signup') ||
    url.includes('auth/logout')
  );
}

async function refreshAccessToken(): Promise<{ token: string; refreshToken: string }> {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) {
    throw new Error('Sem refresh token');
  }
  const { data } = await axios.post<{
    token: string;
    refreshToken: string;
  }>(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-gds-channel': 'web',
      },
    },
  );
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
  return data;
}

// Request interceptor para adicionar token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (config.headers) {
      config.headers['x-gds-channel'] = 'web';
    }
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// Response interceptor: tenta refresh em 401 antes de deslogar
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    if (shouldSkipRefreshForUrl(originalRequest.url)) {
      clearSessionAndMaybeRedirect();
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      clearSessionAndMaybeRedirect();
      return Promise.reject(error);
    }

    const storedRefresh = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!storedRefresh) {
      clearSessionAndMaybeRedirect();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshTokensPromise) {
        refreshTokensPromise = refreshAccessToken().finally(() => {
          refreshTokensPromise = null;
        });
      }
      const { token } = await refreshTokensPromise;
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${token}`;
      }
      return apiClient(originalRequest);
    } catch {
      clearSessionAndMaybeRedirect();
      return Promise.reject(error);
    }
  },
);

export default apiClient;
