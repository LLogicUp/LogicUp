import type { QuizSetSummary } from '../../api/quiz';

interface QuizSetListProps {
  sets: QuizSetSummary[];
  onStart: (setId: number) => void;
}

function QuizSetList({ sets, onStart }: QuizSetListProps) {
  return (
    <div className="quiz-set-list">
      <h2>퀴즈 목록</h2>
      <div className="quiz-cards">
        {sets.map((s) => (
          <button
            key={s.id}
            className="quiz-card"
            onClick={() => onStart(s.id)}
          >
            <div className="quiz-card-title">{s.title}</div>
            <div className="quiz-card-desc">{s.description}</div>
            <div className="quiz-card-meta">{s.question_count}문제</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuizSetList;
