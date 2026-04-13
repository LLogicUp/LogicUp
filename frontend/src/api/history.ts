import { authHeaders } from './auth';

export interface HistoryItem {
  hint_id: number;
  submission_id: number;
  source: string;
  external_problem_id: string | null;
  problem: string;
  hint_level: number;
  explanation: string;
  pseudocode: string;
  code_snippet: string;
  created_at: string;
}

export interface HistoryResponse {
  items: HistoryItem[];
  page: number;
  limit: number;
  total: number;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('unauthorized');
  }
}

export async function fetchHistory(page = 1, limit = 10): Promise<HistoryResponse> {
  const res = await fetch(`http://localhost:8000/history?page=${page}&limit=${limit}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error('히스토리 조회에 실패했습니다.');
  return res.json();
}
