import { useState, useEffect, useCallback } from 'react';
import type {
  QuizScreenState,
  QuizSetSummary,
  QuizQuestion,
  QuizAnswerDraft,
  QuizSubmitResult,
  CategoryStat,
} from '../../api/quiz';
import {
  fetchQuizCategories,
  fetchQuizSets,
  fetchQuizSet,
  submitQuiz,
} from '../../api/quiz';
import QuizSetList from './QuizSetList';
import QuizSession from './QuizSession';
import QuizResult from './QuizResult';

interface QuizPageProps {
  onUnauthorized?: () => void;
}

function QuizPage({ onUnauthorized }: QuizPageProps) {
  const [screen, setScreen] = useState<QuizScreenState>('loading');
  const [sets, setSets] = useState<QuizSetSummary[]>([]);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [activeSetId, setActiveSetId] = useState<number | null>(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);

  function handleUnauthorized() {
    onUnauthorized?.();
  }

  const loadSets = useCallback(async (category: string | null = null) => {
    setScreen('loading');
    setError('');
    try {
      const [cats, data] = await Promise.all([
        fetchQuizCategories(),
        fetchQuizSets(category),
      ]);
      setCategories(cats);
      setSets(data);
      setScreen(data.length === 0 ? 'empty' : 'list');
    } catch (e) {
      if (e instanceof Error && e.message === 'Unauthorized') {
        handleUnauthorized();
        return;
      }
      setError(e instanceof Error ? e.message : '퀴즈 목록을 불러오지 못했습니다.');
      setScreen('error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadSets(null);
  }, [loadSets]);

  async function handleCategoryChange(cat: string | null) {
    setActiveCategory(cat);
    setScreen('loading');
    setError('');
    try {
      const data = await fetchQuizSets(cat);
      setSets(data);
      setScreen(data.length === 0 ? 'empty' : 'list');
    } catch (e) {
      if (e instanceof Error && e.message === 'Unauthorized') {
        handleUnauthorized();
        return;
      }
      setError(e instanceof Error ? e.message : '퀴즈 목록을 불러오지 못했습니다.');
      setScreen('error');
    }
  }

  async function handleStart(setId: number) {
    setScreen('loading');
    setError('');
    try {
      const data = await fetchQuizSet(setId);
      setActiveSetId(data.id);
      setActiveTitle(data.title);
      setQuestions(data.questions);
      setResult(null);
      setScreen('session');
    } catch (e) {
      if (e instanceof Error && e.message === 'Unauthorized') {
        handleUnauthorized();
        return;
      }
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
      if (e instanceof Error && e.message === 'Unauthorized') {
        handleUnauthorized();
        return;
      }
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
        <button onClick={() => loadSets(activeCategory)}>다시 시도</button>
      </div>
    );
  }

  if (screen === 'list') {
    return (
      <div className="quiz-page">
        <QuizSetList
          sets={sets}
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          onStart={handleStart}
        />
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
