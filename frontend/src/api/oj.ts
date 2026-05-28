import { authHeaders, clearToken } from './auth';
import { apiUrl } from './client';

export interface OjProblemSummary {
  number: number;
  title: string;
}

export interface OjExample {
  input: string;
  output: string;
}

export interface OjProblemDetail extends OjProblemSummary {
  description: string;
  examples: OjExample[];
}

export interface OjChapterSummary {
  chapter: number;
  file: string;
  problems: OjProblemSummary[];
}

export interface OjSubjectSummary {
  key: string;
  label: string;
  chapters: OjChapterSummary[];
}

export class SejongRequiredError extends Error {
  constructor() {
    super('SejongRequired');
  }
}

function handleOjAuthError(res: Response): void {
  if (res.status === 401) {
    clearToken();
    throw new Error('Unauthorized');
  }
  if (res.status === 403) {
    throw new SejongRequiredError();
  }
}

export async function fetchOjIndex(): Promise<OjSubjectSummary[]> {
  const res = await fetch(apiUrl('/oj'), {
    headers: authHeaders(),
  });
  handleOjAuthError(res);
  if (!res.ok) throw new Error('OJ 목록을 불러오지 못했습니다.');
  const data = await res.json();
  return data.subjects ?? [];
}

export async function fetchOjProblem(
  subject: string,
  chapter: string,
  problemNumber: string
): Promise<OjProblemDetail> {
  const res = await fetch(
    apiUrl(`/oj/${encodeURIComponent(subject)}/${encodeURIComponent(chapter)}/${encodeURIComponent(problemNumber)}`),
    { headers: authHeaders() }
  );
  handleOjAuthError(res);
  if (!res.ok) throw new Error('OJ 문제를 불러오지 못했습니다.');
  const data = await res.json();
  return data.problem;
}
