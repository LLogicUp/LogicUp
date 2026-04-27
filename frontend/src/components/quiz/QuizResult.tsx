import type { QuizSubmitResult, QuizQuestion } from '../../api/quiz';

interface QuizResultProps {
  result: QuizSubmitResult;
  questions: QuizQuestion[];
  onBack: () => void;
}

function QuizResult({ result, questions, onBack }: QuizResultProps) {
  const questionMap = Object.fromEntries(questions.map((q) => [q.id, q]));
  const percentage = Math.round((result.score / result.total) * 100);

  return (
    <div className="quiz-result">
      <div className="quiz-result-summary">
        <div className="quiz-result-score">
          {result.score} / {result.total}
        </div>
        <div className="quiz-result-percent">{percentage}%</div>
        <div className="quiz-result-message">
          {percentage === 100 ? '완벽합니다!' : percentage >= 70 ? '잘 했어요!' : '다시 복습해 봐요.'}
        </div>
      </div>

      <div className="quiz-result-list">
        {result.results.map((r, i) => {
          const q = questionMap[r.question_id];
          return (
            <div
              key={r.question_id}
              className={`quiz-result-item${r.is_correct ? ' correct' : ' wrong'}`}
            >
              <div className="quiz-result-item-header">
                <span className="quiz-result-badge">{r.is_correct ? '정답' : '오답'}</span>
                <span className="quiz-result-qnum">Q{i + 1}</span>
              </div>
              <div className="quiz-result-question">{q?.content}</div>
              <div className="quiz-result-answer">
                <span className="quiz-answer-label">정답:</span> {r.correct_answer}
              </div>
              {r.explanation && (
                <div className="quiz-result-explanation">{r.explanation}</div>
              )}
            </div>
          );
        })}
      </div>

      <button className="quiz-back-to-list" onClick={onBack}>
        목록으로 돌아가기
      </button>
    </div>
  );
}

export default QuizResult;
