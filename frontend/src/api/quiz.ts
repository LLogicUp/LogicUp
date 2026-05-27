import { authHeaders } from './auth';
import { apiUrl } from './client';

export type QuestionType = 'short_answer' | 'multiple_choice';
export type QuizLanguage = 'c' | 'cpp' | 'python' | 'java';

export type QuizScreenState =
  | 'list'
  | 'loading'
  | 'empty'
  | 'session'
  | 'submitting'
  | 'result'
  | 'error';

export interface CategoryStat {
  category: string;
  count: number;
}

export interface QuizSetSummary {
  id: number;
  title: string;
  description: string;
  question_count: number;
  categories: string[];
}

export interface QuizQuestion {
  id: number;
  question_type: QuestionType;
  content: string;
  choices: string[] | null;
  categories: string[];
}

export interface QuizAnswerDraft {
  question_id: number;
  user_answer: string;
}

export interface QuizSubmitRequest {
  set_id: number;
  answers: QuizAnswerDraft[];
}

export interface QuizQuestionResult {
  question_id: number;
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  mistake_types: string[];
}

export interface QuizSubmitResult {
  score: number;
  total: number;
  results: QuizQuestionResult[];
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...init?.headers },
  });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchQuizCategories(): Promise<CategoryStat[]> {
  return apiFetch<CategoryStat[]>('/quiz/categories');
}

export async function fetchQuizSets(category?: string | null): Promise<QuizSetSummary[]> {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return apiFetch<QuizSetSummary[]>(`/quiz/sets${query}`);
}

export async function fetchQuizSet(
  setId: number
): Promise<{ id: number; title: string; questions: QuizQuestion[] }> {
  return apiFetch(`/quiz/sets/${setId}`);
}

export async function submitQuiz(
  setId: number,
  answers: QuizAnswerDraft[]
): Promise<QuizSubmitResult> {
  const body: QuizSubmitRequest = { set_id: setId, answers };
  return apiFetch<QuizSubmitResult>('/quiz/submit', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function generateQuiz(
  count = 3,
  categories: string[] = [],
  language: QuizLanguage = 'c'
): Promise<{ id: number; title: string; questions: QuizQuestion[] }> {
  return apiFetch('/quiz/generate', {
    method: 'POST',
    body: JSON.stringify({ count, categories, language }),
  });
}
