import { supabase } from './supabaseClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(body?.error || `요청에 실패했습니다 (${res.status})`, res.status);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export { ApiError };
