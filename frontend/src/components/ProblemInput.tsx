import Card from './ui/Card';
import type { Source } from './Header';

interface ProblemInputProps {
  source: Source;
  problem: string;
  expectedInput: string;
  expectedOutput: string;
  problemUrl: string;
  onProblemChange: (value: string) => void;
  onExpectedInputChange: (value: string) => void;
  onExpectedOutputChange: (value: string) => void;
  onProblemUrlChange: (value: string) => void;
}

function ProblemInput({
  source,
  problem,
  expectedInput,
  expectedOutput,
  problemNumber,
  locked = false,
  onProblemChange,
  onExpectedInputChange,
  onExpectedOutputChange,
  onProblemUrlChange,
}: ProblemInputProps) {
  if (source === 'direct') {
    return (
      <Card title="문제 입력">
        <div className="input-field">
          <label>문제 설명</label>
          <textarea
            value={problem}
            onChange={(e) => onProblemChange(e.target.value)}
            placeholder="문제를 입력하세요 (선택)"
            rows={4}
            disabled={locked}
          />
        </div>
        <div className="example-row">
          <div className="input-field">
            <label>입력 예시</label>
            <textarea
              value={expectedInput}
              onChange={(e) => onExpectedInputChange(e.target.value)}
              placeholder="입력 예시 (선택)"
              rows={3}
              disabled={locked}
            />
          </div>
          <div className="input-field">
            <label>출력 예시</label>
            <textarea
              value={expectedOutput}
              onChange={(e) => onExpectedOutputChange(e.target.value)}
              placeholder="출력 예시 (선택)"
              rows={3}
              disabled={locked}
            />
          </div>
        </div>
      </Card>
    );
  }

  if (source === 'baekjoon') {
    return (
      <Card title="백준 문제">
        <div className="input-field">
          <label>문제 URL</label>
          <input
            type="text"
            className="problem-number-input"
            value={problemUrl}
            onChange={(e) => onProblemUrlChange(e.target.value)}
            placeholder="문제 URL을 입력하세요 (예: https://www.acmicpc.net/problem/1000)"
          />
        </div>
      </Card>
    );
  }

  return (
    <Card title="문제 입력">
      <p className="hint-placeholder">준비 중입니다.</p>
    </Card>
  );
}

export default ProblemInput;
