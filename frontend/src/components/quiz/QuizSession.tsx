import { useState } from 'react';
import type { QuizQuestion, QuizAnswerDraft } from '../../api/quiz';
import AnswerInput from './AnswerInput';

interface QuizSessionProps {
  setTitle: string;
  questions: QuizQuestion[];
  isSubmitting: boolean;
  onSubmit: (answers: QuizAnswerDraft[]) => void;
  onBack: () => void;
}

function QuizSession({ setTitle, questions, isSubmitting, onSubmit, onBack }: QuizSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const current = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const currentAnswer = answers[current.id] ?? '';
  const allAnswered = questions.every((q) => (answers[q.id] ?? '').trim() !== '');

  const setAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleSubmit = () => {
    const drafts: QuizAnswerDraft[] = questions.map((q) => ({
      question_id: q.id,
      user_answer: answers[q.id] ?? '',
    }));
    onSubmit(drafts);
  };

  return (
    <div className="quiz-session">
      <div className="quiz-session-header">
        <button className="quiz-back-btn" onClick={onBack} disabled={isSubmitting}>
          ← 목록으로
        </button>
        <span className="quiz-session-title">{setTitle}</span>
        <span className="quiz-progress">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      <div className="quiz-question-card">
        <div className="quiz-question-number">Q{currentIndex + 1}</div>
        <div className="quiz-question-content">{current.content}</div>
        <AnswerInput
          value={currentAnswer}
          onChange={setAnswer}
          onSubmit={isLast ? handleSubmit : goNext}
          disabled={isSubmitting}
        />
      </div>

      <div className="quiz-session-nav">
        <button onClick={goPrev} disabled={currentIndex === 0 || isSubmitting}>
          이전
        </button>
        {isLast ? (
          <button
            className="quiz-submit-btn"
            onClick={handleSubmit}
            disabled={!allAnswered || isSubmitting}
          >
            {isSubmitting ? '채점 중...' : '제출'}
          </button>
        ) : (
          <button onClick={goNext} disabled={isSubmitting}>
            다음
          </button>
        )}
      </div>

      <div className="quiz-answer-progress">
        {questions.map((q, i) => (
          <button
            key={q.id}
            className={`quiz-dot${i === currentIndex ? ' active' : ''}${(answers[q.id] ?? '').trim() ? ' answered' : ''}`}
            onClick={() => setCurrentIndex(i)}
            disabled={isSubmitting}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuizSession;
