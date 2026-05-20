import { useAuthStore } from '../stores/auth-store';

const BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1` 
  : 'http://localhost:4000/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  meta: { timestamp: string; [key: string]: any };
  error: { code: string; message: string; messageFA: string } | null;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export async function apiClient<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const { accessToken } = useAuthStore.getState();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const url = `${BASE_URL}${endpoint}`;

  let response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!refreshRes.ok) {
          useAuthStore.getState().logout();
          throw new Error('Refresh token expired');
        }

        const data: ApiResponse<{ accessToken: string; user: any }> = await refreshRes.json();
        if (data.success && data.data) {
          useAuthStore.getState().setAuth(data.data.user, data.data.accessToken);
          onRefreshed(data.data.accessToken);
        } else {
          useAuthStore.getState().logout();
        }
      } catch (err) {
        useAuthStore.getState().logout();
      } finally {
        isRefreshing = false;
      }
    }

    const newToken = await new Promise<string>((resolve) => {
      refreshSubscribers.push(resolve);
    });

    headers['Authorization'] = `Bearer ${newToken}`;
    response = await fetch(url, { ...options, headers });
  }

  const result: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    data: null as any,
    meta: { timestamp: new Date().toISOString() },
    error: {
      code: 'PARSE_ERROR',
      message: 'Failed to parse server response',
      messageFA: 'خطا در دریافت پاسخ از سرور',
    },
  }));

  if (!result.success) {
    throw result;
  }

  return result;
}
