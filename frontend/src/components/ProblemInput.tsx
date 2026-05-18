import Card from './ui/Card';
import type { Source } from './Header';

export type OjSubject = 'c_program' | 'advanced_c' | 'data_structure' | 'algo';

export const OJ_SUBJECT_LABELS: Record<OjSubject, string> = {
  c_program: 'C 프로그래밍',
  advanced_c: '고급 C',
  data_structure: '자료구조',
  algo: '알고리즘',
};

interface ProblemInputProps {
  source: Source;
  problem: string;
  expectedInput: string;
  expectedOutput: string;
  problemUrl: string;
  ojSubject: OjSubject;
  ojChapter: string;
  ojProblemNumber: string;
  locked?: boolean;
  onProblemChange: (value: string) => void;
  onExpectedInputChange: (value: string) => void;
  onExpectedOutputChange: (value: string) => void;
  onProblemUrlChange: (value: string) => void;
  onOjSubjectChange: (value: OjSubject) => void;
  onOjChapterChange: (value: string) => void;
  onOjProblemNumberChange: (value: string) => void;
}

function ProblemInput({
  source,
  problem,
  expectedInput,
  expectedOutput,
  problemUrl,
  ojSubject,
  ojChapter,
  ojProblemNumber,
  locked = false,
  onProblemChange,
  onExpectedInputChange,
  onExpectedOutputChange,
  onProblemUrlChange,
  onOjSubjectChange,
  onOjChapterChange,
  onOjProblemNumberChange,
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

  if (source === 'url') {
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

  return (
    <Card title="OJ 문제 선택">
      <div className="oj-input-grid">
        <div className="input-field">
          <label>과목</label>
          <select
            className="oj-select"
            value={ojSubject}
            onChange={(e) => onOjSubjectChange(e.target.value as OjSubject)}
            disabled={locked}
          >
            {Object.entries(OJ_SUBJECT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="input-field">
          <label>장</label>
          <input
            type="number"
            min="1"
            className="oj-number-input"
            value={ojChapter}
            onChange={(e) => onOjChapterChange(e.target.value)}
            placeholder="예: 3"
            disabled={locked}
          />
        </div>
        <div className="input-field">
          <label>문제 번호</label>
          <input
            type="number"
            min="1"
            className="oj-number-input"
            value={ojProblemNumber}
            onChange={(e) => onOjProblemNumberChange(e.target.value)}
            placeholder="예: 5"
            disabled={locked}
          />
        </div>
      </div>

      <div className="oj-current-target" aria-live="polite">
        <span className="oj-current-target__label">현재 선택</span>
        <span className="oj-current-target__value">
          {OJ_SUBJECT_LABELS[ojSubject]}
          {ojChapter ? ` ${ojChapter}장` : ' 장 미선택'}
          {ojProblemNumber ? ` ${ojProblemNumber}번` : ' 문제 미선택'}
        </span>
      </div>
    </Card>
  );
}

export default ProblemInput;
