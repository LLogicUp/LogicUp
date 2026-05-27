import { apiUrl } from './client';

const TOKEN_KEY = 'lu_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface TokenPayload {
  user_id?: number;
  nickname?: string;
  is_sejong_verified?: boolean;
  exp?: number;
}

export function getTokenPayload(): TokenPayload | null {
  const token = getToken();
  if (!token) return null;

  try {
    const base64url = token.split('.')[1];
    if (!base64url) return null;
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function isSejongVerifiedToken(): boolean {
  return getTokenPayload()?.is_sejong_verified === true;
}

function extractErrorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const msg: string = detail[0].msg ?? fallback;
    return msg.replace(/^Value error,\s*/, '');
  }
  return fallback;
}

export async function login(userid: string, password: string): Promise<void> {
  const res = await fetch(apiUrl('/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userid, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(extractErrorMessage(err.detail, '로그인에 실패했습니다.'));
  }
  const data = await res.json();
  setToken(data.access_token);
}

export async function register(userid: string, password: string): Promise<void> {
  const res = await fetch(apiUrl('/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userid, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(extractErrorMessage(err.detail, '회원가입에 실패했습니다.'));
  }
}

export async function kakaoLogin(code: string): Promise<void> {
  const res = await fetch(apiUrl('/auth/kakao'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(extractErrorMessage(err.detail, '카카오 로그인에 실패했습니다.'));
  }
  const data = await res.json();
  setToken(data.access_token);
}

export async function sejongLogin(studentId: string, password: string): Promise<void> {
  const res = await fetch(apiUrl('/auth/sejong'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id: studentId, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(extractErrorMessage(err.detail, '세종대 포털 로그인에 실패했습니다.'));
  }
  const data = await res.json();
  setToken(data.access_token);
}
