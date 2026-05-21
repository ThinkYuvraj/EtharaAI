export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:5000';
export const TOKEN_KEY = 'ttm_token';
export const USER_KEY = 'ttm_user';

export type ApiError = { message: string };

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json');

  const token = getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const data = (await parseJsonSafe(res)) as Partial<ApiError> | null;
    const message = data?.message ?? `Request failed with ${res.status}`;
    throw new Error(message);
  }

  return (await parseJsonSafe(res)) as T;
}

