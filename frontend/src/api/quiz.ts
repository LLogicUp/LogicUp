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

export interface QuizTarget {
  id: string;    // e.g. "boj-1000" or "direct-abc"
  label: string; // e.g. "백준 1000번" or "직접 입력"
}

// ── Mock 데이터 ── 자주 나오는 오류 패턴 기반 퀴즈 세트

const MOCK_SETS: QuizSetSummary[] = [
  {
    id: 1,
    title: '포인터 & 메모리 오류',
    description: '힌트 요청 중 자주 발생한 포인터/메모리 관련 실수 패턴',
    question_count: 4,
    created_at: '2026-04-27T00:00:00Z',
  },
  {
    id: 2,
    title: '배열 & 경계 초과',
    description: '배열 인덱스 범위 초과 및 버퍼 오버플로우 관련 오류',
    question_count: 3,
    created_at: '2026-04-27T00:00:00Z',
  },
  {
    id: 3,
    title: '반복문 & 종료 조건',
    description: '무한루프, off-by-one 오류 등 반복문 관련 실수',
    question_count: 4,
    created_at: '2026-04-27T00:00:00Z',
  },
  {
    id: 4,
    title: '입출력 & 형식 지정자',
    description: 'scanf/printf 형식 지정자 오류 및 개행 처리',
    question_count: 3,
    created_at: '2026-04-27T00:00:00Z',
  },
];

const MOCK_QUESTIONS: Record<number, QuizQuestion[]> = {
  1: [
    { id: 1, question_type: 'short_answer', content: 'malloc으로 할당한 메모리를 해제하는 함수는?' },
    { id: 2, question_type: 'short_answer', content: 'NULL 포인터를 역참조할 때 발생하는 오류를 무엇이라 하나요?' },
    { id: 3, question_type: 'short_answer', content: '동적 메모리 할당 후 해제하지 않아 발생하는 문제는?' },
    { id: 4, question_type: 'short_answer', content: '포인터 선언 시 초기화하지 않으면 어떤 위험이 있나요? (한 줄)' },
  ],
  2: [
    { id: 5, question_type: 'short_answer', content: 'C 배열 크기가 N일 때 마지막 유효 인덱스는?' },
    { id: 6, question_type: 'short_answer', content: 'for(i=0; i<=N; i++) 에서 arr[i] 접근 시 발생하는 문제는?' },
    { id: 7, question_type: 'short_answer', content: 'gets() 함수 대신 안전하게 문자열을 입력받는 함수는?' },
  ],
  3: [
    { id: 8,  question_type: 'short_answer', content: 'while(1) 루프를 탈출하는 키워드는?' },
    { id: 9,  question_type: 'short_answer', content: '0부터 N-1까지 정확히 N번 반복하는 for문 조건식은?' },
    { id: 10, question_type: 'short_answer', content: 'off-by-one 오류란? (한 줄로 설명)' },
    { id: 11, question_type: 'short_answer', content: 'do-while과 while의 차이점은? (실행 횟수 관점)' },
  ],
  4: [
    { id: 12, question_type: 'short_answer', content: 'scanf에서 정수·실수·문자열의 형식 지정자를 순서대로 나열하면?' },
    { id: 13, question_type: 'short_answer', content: 'printf 출력 버퍼를 즉시 비우는 함수는?' },
    { id: 14, question_type: 'short_answer', content: 'scanf로 문자(char)를 입력받을 때 앞 공백을 무시하는 방법은?' },
  ],
};

const MOCK_ANSWERS: Record<number, { answer: string; explanation: string }> = {
  1:  { answer: 'free', explanation: 'malloc/calloc으로 할당한 메모리는 반드시 free()로 해제해야 합니다.' },
  2:  { answer: '세그멘테이션 폴트', explanation: 'NULL 포인터 역참조는 Segmentation Fault(SIGSEGV)를 유발합니다.' },
  3:  { answer: '메모리 누수', explanation: '할당된 메모리를 해제하지 않으면 메모리 누수(Memory Leak)가 발생합니다.' },
  4:  { answer: '쓰레기 값 참조', explanation: '초기화되지 않은 포인터는 임의의 주소를 가리켜 예측 불가능한 동작이 발생합니다.' },
  5:  { answer: 'N-1', explanation: 'C 배열 인덱스는 0부터 시작하므로 마지막 유효 인덱스는 N-1입니다.' },
  6:  { answer: '배열 범위 초과(버퍼 오버플로우)', explanation: 'i<=N은 N+1번 반복되어 arr[N] 접근 시 배열 범위를 벗어납니다.' },
  7:  { answer: 'fgets', explanation: 'gets()는 버퍼 크기를 체크하지 않습니다. fgets(str, size, stdin)을 사용하세요.' },
  8:  { answer: 'break', explanation: 'break 문은 가장 가까운 반복문이나 switch를 즉시 탈출합니다.' },
  9:  { answer: 'i < N', explanation: 'for(i=0; i<N; i++) 는 i가 0,1,...,N-1까지 정확히 N번 반복합니다.' },
  10: { answer: '경계값을 1 빠르거나 늦게 처리하는 오류', explanation: '예를 들어 i<=N 대신 i<N을 써야 할 때 발생합니다.' },
  11: { answer: 'do-while은 최소 1번 실행', explanation: 'while은 조건 먼저 검사, do-while은 본문 실행 후 조건 검사합니다.' },
  12: { answer: '%d, %f, %s', explanation: '정수는 %d, 실수는 %f, 문자열은 %s를 사용합니다.' },
  13: { answer: 'fflush(stdout)', explanation: 'stdout은 기본적으로 버퍼링되므로 fflush(stdout)으로 강제 출력합니다.' },
  14: { answer: '" %c" (앞에 공백)', explanation: 'scanf(" %c", &c)처럼 형식 지정자 앞에 공백을 넣으면 공백/개행을 무시합니다.' },
};

// ── Mock 데이터 ── 개별 문제 퀴즈 (문제별 힌트 패턴 기반)

const DEFAULT_PROBLEM_QUESTIONS: QuizQuestion[] = [
  { id: 200, question_type: 'short_answer', content: '이 문제에서 가장 많이 발생한 오류: 배열 크기가 N일 때 유효한 인덱스 범위는?' },
  { id: 201, question_type: 'short_answer', content: 'C에서 정수를 실수로 나누려면 어떻게 해야 하나요? (캐스팅 방법)' },
  { id: 202, question_type: 'short_answer', content: 'scanf로 한 줄에서 두 정수 a, b를 입력받는 코드를 작성하면?' },
  { id: 203, question_type: 'short_answer', content: 'for문에서 i가 0부터 N-1까지 반복할 때 올바른 종료 조건은?' },
];

const DEFAULT_PROBLEM_ANSWERS: Record<number, { answer: string; explanation: string }> = {
  200: { answer: '0 ~ N-1', explanation: 'C 배열 인덱스는 0부터 시작하며 마지막 유효 인덱스는 N-1입니다.' },
  201: { answer: '(double)로 캐스팅', explanation: '(double)a / b처럼 피연산자 하나를 캐스팅하면 실수 나눗셈이 됩니다.' },
  202: { answer: 'scanf("%d %d", &a, &b)', explanation: 'scanf는 공백으로 구분된 여러 값을 순서대로 읽습니다.' },
  203: { answer: 'i < N', explanation: '0부터 N-1까지 N번 반복하려면 i < N 조건을 사용합니다.' },
};

// ── 공통 채점 헬퍼 ──

function gradeAnswers(
  answers: QuizAnswerDraft[],
  answerMap: Record<number, { answer: string; explanation: string }>
): QuizSubmitResult {
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '');
  const results: QuizQuestionResult[] = answers.map((a) => {
    const meta = answerMap[a.question_id];
    if (!meta) return { question_id: a.question_id, is_correct: false, correct_answer: '알 수 없음' };
    return {
      question_id: a.question_id,
      is_correct: normalize(a.user_answer) === normalize(meta.answer),
      correct_answer: meta.answer,
      explanation: meta.explanation,
      mistake_types: [],
    };
  });
  return { score: results.filter((r) => r.is_correct).length, total: results.length, results };
}

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
  return gradeAnswers(answers, MOCK_ANSWERS);
}

export async function fetchProblemQuiz(
  target: QuizTarget
): Promise<{ title: string; questions: QuizQuestion[] }> {
  await delay(400);
  return { title: `${target.label} 오류 패턴 퀴즈`, questions: DEFAULT_PROBLEM_QUESTIONS };
}

export async function submitProblemQuiz(
  _target: QuizTarget,
  answers: QuizAnswerDraft[]
): Promise<QuizSubmitResult> {
  await delay(600);
  return gradeAnswers(answers, DEFAULT_PROBLEM_ANSWERS);
}
