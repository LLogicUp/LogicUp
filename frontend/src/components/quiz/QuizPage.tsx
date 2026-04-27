import { useState, useEffect } from 'react';
import type {
  QuizScreenState,
  QuizSetSummary,
  QuizQuestion,
  QuizAnswerDraft,
  QuizSubmitResult,
} from '../../api/quiz';
import { fetchQuizSets, fetchQuizSet, submitQuiz } from '../../api/quiz';
import QuizSetList from './QuizSetList';
import QuizSession from './QuizSession';
import QuizResult from './QuizResult';

function QuizPage() {
  const [screen, setScreen] = useState<QuizScreenState>('loading');
  const [sets, setSets] = useState<QuizSetSummary[]>([]);
  const [error, setError] = useState('');

  const [activeSetId, setActiveSetId] = useState<number | null>(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);

  useEffect(() => {
    loadSets();
  }, []);

  async function loadSets() {
    setScreen('loading');
    setError('');
    try {
      const data = await fetchQuizSets();
      setSets(data);
      setScreen(data.length === 0 ? 'empty' : 'list');
    } catch (e) {
      setError(e instanceof Error ? e.message : '퀴즈 목록을 불러오지 못했습니다.');
      setScreen('error');
    }
  }

  async function handleStart(setId: number) {
    setScreen('loading');
    setError('');
    try {
      const data = await fetchQuizSet(setId);
      setActiveSetId(setId);
      setActiveTitle(data.title);
      setQuestions(data.questions);
      setResult(null);
      setScreen('session');
    } catch (e) {
      setError(e instanceof Error ? e.message : '퀴즈를 불러오지 못했습니다.');
      setScreen('error');
    }
  }

  async function handleSubmit(answers: QuizAnswerDraft[]) {
    if (activeSetId === null) return;
    setScreen('submitting');
    setError('');
    try {
      const data = await submitQuiz(activeSetId, answers);
      setResult(data);
      setScreen('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : '제출에 실패했습니다.');
      setScreen('error');
    }
  }

  function handleBackToList() {
    setActiveSetId(null);
    setActiveTitle('');
    setQuestions([]);
    setResult(null);
    setScreen('list');
  }

  if (screen === 'loading') {
    return <div className="quiz-status">불러오는 중...</div>;
  }

  if (screen === 'empty') {
    return <div className="quiz-status">아직 퀴즈가 없습니다.</div>;
  }

  if (screen === 'error') {
    return (
      <div className="quiz-status quiz-error">
        <p>{error}</p>
        <button onClick={loadSets}>다시 시도</button>
      </div>
    );
  }

  if (screen === 'list') {
    return (
      <div className="quiz-page">
        <QuizSetList sets={sets} onStart={handleStart} />
      </div>
    );
  }

  if (screen === 'session' || screen === 'submitting') {
    return (
      <div className="quiz-page">
        <QuizSession
          setTitle={activeTitle}
          questions={questions}
          isSubmitting={screen === 'submitting'}
          onSubmit={handleSubmit}
          onBack={handleBackToList}
        />
      </div>
    );
  }

  if (screen === 'result' && result) {
    return (
      <div className="quiz-page">
        <QuizResult result={result} questions={questions} onBack={handleBackToList} />
      </div>
    );
  }

  return null;
}

export default QuizPage;
