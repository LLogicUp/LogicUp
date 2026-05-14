import { authHeaders, clearToken } from './auth';

export type OJLevel = 'c' | 'advanced_c' | 'data_structure' | 'algorithm';

export interface OJLevelInfo {
  id: OJLevel;
  label: string;
  description: string;
  problem_count: number;
  weeks: number[];
}

export interface OJProblemSummary {
  id: number;
  title: string;
  level: OJLevel;
  week: number;
  tags?: string[];
}

export async function fetchOJLevels(): Promise<OJLevelInfo[]> {
  const res = await fetch('http://localhost:8000/oj/levels', {
    headers: authHeaders(),
  });
  if (res.status === 401) {
    clearToken();
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.levels ?? []) as OJLevelInfo[];
}

export async function fetchOJProblems(level: OJLevel): Promise<OJProblemSummary[]> {
  const res = await fetch(`http://localhost:8000/oj/problems?level=${level}`, {
    headers: authHeaders(),
  });
  if (res.status === 401) {
    clearToken();
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.problems ?? []) as OJProblemSummary[];
}
