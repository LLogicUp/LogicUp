export type QuestionType = 'short_answer';

export type QuizScreenState =
  | 'list'
  | 'loading'
  | 'empty'
  | 'session'
  | 'submitting'
  | 'result'
  | 'error';

export interface QuizSetSummary {
  id: number;
  title: string;
  description: string;
  question_count: number;
  created_at: string;
}

export interface QuizQuestion {
  id: number;
  question_type: QuestionType;
  content: string;
}

export interface QuizAnswerDraft {
  question_id: number;
  user_answer: string;
}

export interface QuizQuestionResult {
  question_id: number;
  is_correct: boolean;
  correct_answer: string;
  explanation?: string;
  mistake_types?: string[];
}

export interface QuizSubmitResult {
  score: number;
  total: number;
  results: QuizQuestionResult[];
}

// ── Mock 데이터 ──

const MOCK_SETS: QuizSetSummary[] = [
  {
    id: 1,
    title: '자료구조 기초',
    description: '스택, 큐, 연결리스트 기본 개념',
    question_count: 3,
    created_at: '2026-04-27T00:00:00Z',
  },
  {
    id: 2,
    title: '시간복잡도',
    description: '알고리즘 복잡도 분석',
    question_count: 2,
    created_at: '2026-04-27T00:00:00Z',
  },
];

const MOCK_QUESTIONS: Record<number, QuizQuestion[]> = {
  1: [
    { id: 1, question_type: 'short_answer', content: '스택의 push/pop 시간복잡도는?' },
    { id: 2, question_type: 'short_answer', content: '큐에서 삽입 연산을 무엇이라고 하는가?' },
    { id: 3, question_type: 'short_answer', content: '연결리스트에서 임의 원소 접근의 시간복잡도는?' },
  ],
  2: [
    { id: 4, question_type: 'short_answer', content: '버블 정렬의 최악 시간복잡도는?' },
    { id: 5, question_type: 'short_answer', content: '이진 탐색의 시간복잡도는?' },
  ],
};

const MOCK_ANSWERS: Record<number, { answer: string; explanation: string }> = {
  1: { answer: 'O(1)', explanation: 'push/pop은 스택의 최상단에서만 일어나므로 상수 시간입니다.' },
  2: { answer: 'enqueue', explanation: '큐는 FIFO 구조로 삽입은 enqueue, 삭제는 dequeue입니다.' },
  3: { answer: 'O(n)', explanation: '연결리스트는 순차 탐색이 필요하므로 O(n)입니다.' },
  4: { answer: 'O(n²)', explanation: '버블 정렬은 중첩 반복문으로 최악의 경우 O(n²)입니다.' },
  5: { answer: 'O(log n)', explanation: '이진 탐색은 매 단계마다 탐색 범위를 절반으로 줄입니다.' },
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── API 함수 (Step 4에서 실제 API로 교체) ──

export async function fetchQuizSets(): Promise<QuizSetSummary[]> {
  await delay(500);
  return MOCK_SETS;
}

export async function fetchQuizSet(
  setId: number
): Promise<{ set_id: number; title: string; questions: QuizQuestion[] }> {
  await delay(300);
  const questions = MOCK_QUESTIONS[setId];
  if (!questions) throw new Error('퀴즈를 찾을 수 없습니다.');
  const set = MOCK_SETS.find((s) => s.id === setId);
  if (!set) throw new Error('퀴즈 세트를 찾을 수 없습니다.');
  return { set_id: setId, title: set.title, questions };
}

export async function submitQuiz(
  _setId: number,
  answers: QuizAnswerDraft[]
): Promise<QuizSubmitResult> {
  await delay(600);
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '');
  const results: QuizQuestionResult[] = answers.map((a) => {
    const meta = MOCK_ANSWERS[a.question_id];
    if (!meta) return { question_id: a.question_id, is_correct: false, correct_answer: '알 수 없음' };
    return {
      question_id: a.question_id,
      is_correct: normalize(a.user_answer) === normalize(meta.answer),
      correct_answer: meta.answer,
      explanation: meta.explanation,
      mistake_types: [],
    };
  });
  return {
    score: results.filter((r) => r.is_correct).length,
    total: results.length,
    results,
  };
}
