import { authHeaders, clearToken } from './auth';

export interface HintRequest {
  submission_id: number | null;
  source?: 'direct' | 'url' | 'oj';
  problem_id?: number;
  problem?: string;
  problem_url?: string;
  code: string;
  language: 'c' | 'cpp' | 'python' | 'java';
  expected_input?: string;
  expected_output?: string;
  error_log: string;
  hint_level: number;
}

export interface HintApiResponse {
  submission_id: number;
  hint_id: number;
  hint_level: number;
  explanation: string;
  pseudocode: string;
  error_categories: string[];
}

export async function postHint(req: HintRequest): Promise<HintApiResponse> {
  const res = await fetch('http://localhost:8000/hint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(req),
  });
  if (res.status === 401) {
    clearToken();
    throw new Error('Unauthorized');
  }
  if (res.status === 403) {
    throw new Error('SejongRequired');
  }
  if (!res.ok) {
    throw new Error('HintRequestFailed');
  }
  return res.json();
}
