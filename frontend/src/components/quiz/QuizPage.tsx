import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
  generateQuiz,
} from '../../api/quiz';
import QuizSetList from './QuizSetList';
import QuizSession from './QuizSession';
import QuizResult from './QuizResult';

interface QuizPageProps {
  onUnauthorized?: () => void;
}

interface QuizLocationState {
  autoGenerate?: boolean;
  categories?: string[];
}

function QuizPage({ onUnauthorized }: QuizPageProps) {
  const location = useLocation();
  const locationState = location.state as QuizLocationState | null;
  const autoGenerateRef = useRef(false);
  const [screen, setScreen] = useState<QuizScreenState>('loading');
  const [sets, setSets] = useState<QuizSetSummary[]>([]);
  const [error, setError] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSetId, setActiveSetId] = useState<number | null>(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<CategoryStat[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  function handleUnauthorized() {
    onUnauthorized?.();
  }

  const loadSets = useCallback(async () => {
    setScreen('loading');
    setError('');
    try {
      const data = await fetchQuizSets(null);
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
    if (locationState?.autoGenerate) return;
    loadSets();
  }, [loadSets, locationState?.autoGenerate]);

  useEffect(() => {
    if (!locationState?.autoGenerate || autoGenerateRef.current) return;

    autoGenerateRef.current = true;
    const categories = locationState.categories ?? [];

    setIsGenerating(true);
    setScreen('loading');
    setError('');

    generateQuiz(3, categories)
      .then((data) => {
        setActiveSetId(data.id);
        setActiveTitle(data.title);
        setQuestions(data.questions);
        setResult(null);
        setScreen('session');
      })
      .catch((e) => {
        if (e instanceof Error && e.message === 'Unauthorized') {
          handleUnauthorized();
          return;
        }
        setError(e instanceof Error ? e.message : '퀴즈 생성에 실패했습니다.');
        setScreen('error');
      })
      .finally(() => setIsGenerating(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationState?.autoGenerate]);

  async function handleOpenGenerateModal() {
    setShowGenerateModal(true);
    if (availableCategories.length > 0) return;
    setCategoriesLoading(true);
    try {
      const cats = await fetchQuizCategories();
      setAvailableCategories(cats);
      setSelectedCategories(cats.slice(0, 3).map((c) => c.category));
    } catch (e) {
      if (e instanceof Error && e.message === 'Unauthorized') handleUnauthorized();
    } finally {
      setCategoriesLoading(false);
    }
  }

  function handleToggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function handleGenerate() {
    setShowGenerateModal(false);
    setIsGenerating(true);
    setError('');
    try {
      const data = await generateQuiz(3, selectedCategories);
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
      setError(e instanceof Error ? e.message : '퀴즈 생성에 실패했습니다.');
      setScreen('error');
    } finally {
      setIsGenerating(false);
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
    return (
      <div className="quiz-status">
        <p>아직 퀴즈가 없습니다.</p>
        <button onClick={handleOpenGenerateModal} disabled={isGenerating}>
          {isGenerating ? '퀴즈 생성 중...' : '퀴즈 생성하기'}
        </button>
        {showGenerateModal && (
          <GenerateModal
            categories={availableCategories}
            selected={selectedCategories}
            loading={categoriesLoading}
            isGenerating={isGenerating}
            onToggle={handleToggleCategory}
            onConfirm={handleGenerate}
            onClose={() => setShowGenerateModal(false)}
          />
        )}
      </div>
    );
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
        <QuizSetList
          sets={sets}
          onStart={handleStart}
          onGenerate={handleOpenGenerateModal}
          isGenerating={isGenerating}
        />
        {showGenerateModal && (
          <GenerateModal
            categories={availableCategories}
            selected={selectedCategories}
            loading={categoriesLoading}
            isGenerating={isGenerating}
            onToggle={handleToggleCategory}
            onConfirm={handleGenerate}
            onClose={() => setShowGenerateModal(false)}
          />
        )}
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

interface GenerateModalProps {
  categories: CategoryStat[];
  selected: string[];
  loading: boolean;
  isGenerating: boolean;
  onToggle: (cat: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

function GenerateModal({ categories, selected, loading, isGenerating, onToggle, onConfirm, onClose }: GenerateModalProps) {
  return (
    <div className="gen-modal-overlay" onClick={onClose}>
      <div className="gen-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gen-modal-header">
          <span>출제 유형 선택</span>
          <button className="gen-modal-close" onClick={onClose}>✕</button>
        </div>
        <p className="gen-modal-desc">집중 학습할 오류 유형을 선택하세요.</p>
        {loading ? (
          <div className="gen-modal-loading">불러오는 중...</div>
        ) : categories.length === 0 ? (
          <p className="gen-modal-empty">힌트 기록이 없습니다. 먼저 힌트를 받아보세요.</p>
        ) : (
          <div className="gen-modal-list">
            {categories.map((c) => (
              <label key={c.category} className="gen-modal-item">
                <input
                  type="checkbox"
                  checked={selected.includes(c.category)}
                  onChange={() => onToggle(c.category)}
                />
                <span className="gen-modal-cat">{c.category}</span>
                <span className="gen-modal-count">{c.count}회</span>
              </label>
            ))}
          </div>
        )}
        <div className="gen-modal-footer">
          <button
            className="gen-modal-btn"
            onClick={onConfirm}
            disabled={isGenerating || selected.length === 0 || categories.length === 0}
          >
            {isGenerating ? '생성 중...' : `${selected.length}개 유형으로 생성`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuizPage;
