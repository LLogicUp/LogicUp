import Card from './ui/Card';

interface ProblemInputProps {
  source: 'direct' | 'url';
  problem: string;
  expectedInput: string;
  expectedOutput: string;
  problemUrl: string;
  locked?: boolean;
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
  problemUrl,
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

  return (
    <Card title="문제 불러오기">
      <div className="input-field">
        <label>문제 URL</label>
        <input
          type="text"
          className="problem-url-input"
          value={problemUrl}
          onChange={(e) => onProblemUrlChange(e.target.value)}
          placeholder="문제 URL을 입력하세요 (예: https://www.acmicpc.net/problem/1000)"
        />
      </div>
    </Card>
  );
}

export default ProblemInput;
