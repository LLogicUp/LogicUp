import type { QuizSetSummary, CategoryStat } from '../../api/quiz';

interface QuizSetListProps {
  sets: QuizSetSummary[];
  categories: CategoryStat[];
  activeCategory: string | null;
  onCategoryChange: (cat: string | null) => void;
  onStart: (setId: number) => void;
}

function QuizSetList({ sets, categories, activeCategory, onCategoryChange, onStart }: QuizSetListProps) {
  return (
    <div className="quiz-set-list">
      <h2>퀴즈 목록</h2>

      {categories.length > 0 && (
        <div className="quiz-category-filter">
          <button
            className={`quiz-category-btn${activeCategory === null ? ' active' : ''}`}
            onClick={() => onCategoryChange(null)}
          >
            전체
          </button>
          {categories.map((c) => (
            <button
              key={c.category}
              className={`quiz-category-btn${activeCategory === c.category ? ' active' : ''}`}
              onClick={() => onCategoryChange(c.category)}
            >
              {c.category}
              <span className="quiz-category-count">{c.count}</span>
            </button>
          ))}
        </div>
      )}

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
