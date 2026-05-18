import Card from './ui/Card';
import type { Source } from './Header';
import type { OjChapterSummary, OjProblemSummary, OjSubjectSummary } from '../api/oj';

export type OjSubject = string;

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
  ojSubjectOptions: OjSubjectSummary[];
  ojChapterOptions: OjChapterSummary[];
  ojProblemOptions: OjProblemSummary[];
  ojLoading?: boolean;
  ojError?: string;
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
  ojSubjectOptions,
  ojChapterOptions,
  ojProblemOptions,
  ojLoading = false,
  ojError = '',
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
            disabled={locked || ojLoading || ojSubjectOptions.length === 0}
          >
            {ojSubjectOptions.map((subject) => (
              <option key={subject.key} value={subject.key}>{subject.label}</option>
            ))}
          </select>
        </div>
        <div className="input-field">
          <label>장</label>
          <select
            className="oj-select"
            value={ojChapter}
            onChange={(e) => onOjChapterChange(e.target.value)}
            disabled={locked || ojLoading || ojChapterOptions.length === 0}
          >
            <option value="">장 선택</option>
            {ojChapterOptions.map((chapter) => (
              <option key={chapter.chapter} value={String(chapter.chapter)}>
                {chapter.chapter}장
              </option>
            ))}
          </select>
        </div>
        <div className="input-field">
          <label>문제 번호</label>
          <select
            className="oj-select"
            value={ojProblemNumber}
            onChange={(e) => onOjProblemNumberChange(e.target.value)}
            disabled={locked || ojLoading || ojProblemOptions.length === 0}
          >
            <option value="">문제 선택</option>
            {ojProblemOptions.map((problem) => (
              <option key={problem.number} value={String(problem.number)}>
                {problem.number}번{problem.title ? ` - ${problem.title}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {ojError && <p className="oj-status oj-status--error">{ojError}</p>}
      {ojLoading && <p className="oj-status">OJ 목록을 불러오는 중입니다.</p>}
      {!ojLoading && !ojError && ojSubjectOptions.length === 0 && (
        <p className="oj-status">등록된 OJ 과목이 없습니다.</p>
      )}

      <div className="oj-current-target" aria-live="polite">
        <span className="oj-current-target__label">현재 선택</span>
        <span className="oj-current-target__value">
          {ojSubjectOptions.find((subject) => subject.key === ojSubject)?.label ?? OJ_SUBJECT_LABELS[ojSubject] ?? ojSubject}
          {ojChapter ? ` ${ojChapter}장` : ' 장 미선택'}
          {ojProblemNumber ? ` ${ojProblemNumber}번` : ' 문제 미선택'}
        </span>
      </div>
    </Card>
  );
}

export default ProblemInput;
