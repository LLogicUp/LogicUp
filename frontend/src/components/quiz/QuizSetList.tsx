import type { QuizSetSummary } from '../../api/quiz';

interface QuizSetListProps {
  sets: QuizSetSummary[];
  onStart: (setId: number) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

function QuizSetList({ sets, onStart, onGenerate, isGenerating }: QuizSetListProps) {
  return (
    <div className="quiz-set-list">
      <div className="quiz-list-header">
        <h2>퀴즈 목록</h2>
        <button className="quiz-generate-btn" onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? '생성 중...' : '새 퀴즈 생성'}
        </button>
      </div>

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
            {s.categories.length > 0 && (
              <div className="quiz-card-tags">
                {s.categories.map((cat) => (
                  <span key={cat} className="quiz-card-tag">{cat}</span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuizSetList;
