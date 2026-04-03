import type { Source } from './Header';

interface ProblemInputProps {
  source: Source;
  problem: string;
  expectedOutput: string;
  problemNumber: string;
  onProblemChange: (value: string) => void;
  onExpectedOutputChange: (value: string) => void;
  onProblemNumberChange: (value: string) => void;
}

function ProblemInput({
  source,
  problem,
  expectedOutput,
  problemNumber,
  onProblemChange,
  onExpectedOutputChange,
  onProblemNumberChange,
}: ProblemInputProps) {
  if (source === 'direct') {
    return (
      <>
        <div className="input-field">
          <label>문제 설명</label>
          <textarea
            value={problem}
            onChange={(e) => onProblemChange(e.target.value)}
            placeholder="문제를 입력하세요 (선택)"
            rows={4}
          />
        </div>
        <div className="input-field">
          <label>정답 예시 출력</label>
          <textarea
            value={expectedOutput}
            onChange={(e) => onExpectedOutputChange(e.target.value)}
            placeholder="정답 예시 출력을 입력하세요 (선택)"
            rows={3}
          />
        </div>
      </>
    );
  }

  if (source === 'baekjoon') {
    return (
      <div className="input-field">
        <label>백준 문제 번호</label>
        <input
          type="text"
          className="problem-number-input"
          value={problemNumber}
          onChange={(e) => onProblemNumberChange(e.target.value)}
          placeholder="문제 번호를 입력하세요 (예: 1000)"
        />
      </div>
    );
  }

  return (
    <div className="input-field">
      <p className="hint-placeholder">준비 중입니다.</p>
    </div>
  );
}

export default ProblemInput;
