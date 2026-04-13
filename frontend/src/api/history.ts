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

export interface ProblemSummary {
  external_problem_id: string;
  hint_count: number;
  last_hint_at: string;
}

export interface ProblemListResponse {
  items: ProblemSummary[];
}

export interface SubmissionSummary {
  submission_id: number;
  source: string;
  external_problem_id: string | null;
  problem_snippet: string;
  hint_count: number;
  last_hint_at: string;
}

export interface SubmissionListResponse {
  items: SubmissionSummary[];
}

export interface DirectProblemSummary {
  problem: string;
  problem_snippet: string;
  hint_count: number;
  last_hint_at: string;
}

export interface DirectProblemListResponse {
  items: DirectProblemSummary[];
}

export interface FetchHistoryParams {
  page?: number;
  limit?: number;
  source?: 'baekjoon' | 'direct' | 'oj';
  problem_id?: string;
  submission_id?: number;
  problem_text?: string;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('unauthorized');
  }
}

export async function fetchHistory(params: FetchHistoryParams = {}): Promise<HistoryResponse> {
  const { page = 1, limit = 10, source, problem_id, submission_id, problem_text } = params;
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (source !== undefined) qs.set('source', source);
  if (problem_id !== undefined) qs.set('problem_id', problem_id);
  if (submission_id !== undefined) qs.set('submission_id', String(submission_id));
  if (problem_text !== undefined) qs.set('problem_text', problem_text);

  const res = await fetch(`http://localhost:8000/history?${qs}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error('히스토리 조회에 실패했습니다.');
  return res.json();
}

export async function fetchDirectProblemList(): Promise<DirectProblemListResponse> {
  const res = await fetch('http://localhost:8000/history/direct-problems', {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error('직접입력 문제 목록 조회에 실패했습니다.');
  return res.json();
}

export async function fetchSubmissionList(source?: 'baekjoon' | 'direct' | 'oj'): Promise<SubmissionListResponse> {
  const qs = new URLSearchParams();
  if (source !== undefined) qs.set('source', source);
  const res = await fetch(`http://localhost:8000/history/submissions?${qs}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error('제출 목록 조회에 실패했습니다.');
  return res.json();
}

export async function fetchProblemList(): Promise<ProblemListResponse> {
  const res = await fetch('http://localhost:8000/history/problems', {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error('문제 목록 조회에 실패했습니다.');
  return res.json();
}
