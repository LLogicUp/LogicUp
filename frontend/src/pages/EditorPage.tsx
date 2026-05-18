import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PillButton from '../components/ui/PillButton';
import ProblemInput, { OJ_SUBJECT_LABELS, type OjSubject } from '../components/ProblemInput';
import CodeEditor, { type CodeLanguage } from '../components/CodeEditor';
import HintPanel, { type Hint } from '../components/HintPanel';
import { postHint } from '../api/hint';
import type { HintApiResponse } from '../api/hint';

type Source = 'direct' | 'url' | 'oj';

interface EditorPageProps {
  isDark: boolean;
  onLogout: () => void;
}

export default function EditorPage({ isDark, onLogout }: EditorPageProps) {
  const { source: sourceParam } = useParams<{ source: string }>();
  const source: Source =
    sourceParam === 'url' ? 'url'
    : sourceParam === 'oj' ? 'oj'
    : 'direct';

  const [problemUrl, setProblemUrl] = useState('');
  const [problem, setProblem] = useState('');
  const [expectedInput, setExpectedInput] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [ojSubject, setOjSubject] = useState<OjSubject>('c_program');
  const [ojChapter, setOjChapter] = useState('');
  const [ojProblemNumber, setOjProblemNumber] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<CodeLanguage>('c');
  const [hints, setHints] = useState<Hint[]>([]);
  const [hintLevel, setHintLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submissionId, setSubmissionId] = useState<number | null>(null);

  // source 변경 시 문제 입력 초기화
  useEffect(() => {
    setProblem('');
    setExpectedInput('');
    setExpectedOutput('');
    setProblemUrl('');
    setOjSubject('c_program');
    setOjChapter('');
    setOjProblemNumber('');
  }, [source]);

  useEffect(() => {
    setSubmissionId(null);
  }, [problem, problemUrl, ojSubject, ojChapter, ojProblemNumber, code, language, source]);

  const buildOjProblemText = () => {
    return [
      'OJ 문제 조회 정보',
      `과목: ${OJ_SUBJECT_LABELS[ojSubject]} (${ojSubject})`,
      `장: ${ojChapter || '미입력'}`,
      `문제 번호: ${ojProblemNumber || '미입력'}`,
    ].join('\n');
  };

  const requestHint = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const data: HintApiResponse = await postHint({
        submission_id: submissionId,
        ...(source === 'url'
          ? { problem_url: problemUrl }
          : source === 'oj'
            ? { problem: buildOjProblemText(), expected_input: '', expected_output: '' }
            : { problem, expected_input: expectedInput, expected_output: expectedOutput }),
        code,
        language,
        error_log: '',
        hint_level: hintLevel,
      });
      setSubmissionId(data.submission_id);
      setHints((prev) => [
        ...prev,
        {
          level: data.hint_level,
          explanation: data.explanation ?? '',
          pseudocode: data.pseudocode ?? '',
        },
      ]);
      if (hintLevel < 4) setHintLevel(hintLevel + 1);
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        onLogout();
        return;
      }
      setHints((prev) => [
        ...prev,
        {
          level: hintLevel,
          explanation: '서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인하세요.',
          pseudocode: '',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setProblem('');
    setExpectedInput('');
    setExpectedOutput('');
    setProblemUrl('');
    setOjSubject('c_program');
    setOjChapter('');
    setOjProblemNumber('');
    setCode('');
    setLanguage('c');
    setHints([]);
    setHintLevel(1);
    setSubmissionId(null);
  };

  const getButtonLabel = () => {
    if (loading) return '요청 중...';
    if (hintLevel > 3) return '힌트 완료';
    return `힌트 요청 (${hintLevel}단계)`;
  };

  const ojSelectionLabel = [
    OJ_SUBJECT_LABELS[ojSubject],
    ojChapter ? `${ojChapter}장` : '장 미선택',
    ojProblemNumber ? `${ojProblemNumber}번` : '문제 미선택',
  ].join(' · ');

  return (
    <>
      <main className="main-container">
        <div className="code-editor">
          {source === 'oj' && (
            <div className="oj-mode-summary">
              <span className="oj-mode-summary__tag">OJ</span>
              <span className="oj-mode-summary__text">{ojSelectionLabel}</span>
            </div>
          )}
          <ProblemInput
            source={source}
            problem={problem}
            expectedInput={expectedInput}
            expectedOutput={expectedOutput}
            problemUrl={problemUrl}
            ojSubject={ojSubject}
            ojChapter={ojChapter}
            ojProblemNumber={ojProblemNumber}
            locked={hints.length > 0}
            onProblemChange={setProblem}
            onExpectedInputChange={setExpectedInput}
            onExpectedOutputChange={setExpectedOutput}
            onProblemUrlChange={setProblemUrl}
            onOjSubjectChange={setOjSubject}
            onOjChapterChange={setOjChapter}
            onOjProblemNumberChange={setOjProblemNumber}
          />
          <CodeEditor
            code={code}
            isDark={isDark}
            language={language}
            locked={hints.length > 0}
            onCodeChange={setCode}
            onLanguageChange={setLanguage}
          />
        </div>
        <div className="editor-hint-wrapper">
          <HintPanel hints={hints} />
        </div>
      </main>
      <footer className="App-footer">
        <div className="App-footer__actions">
          <PillButton
            variant="primary"
            style={{ background: 'var(--accent-red)', fontSize: '13px', padding: '8px 20px' }}
            onClick={requestHint}
            disabled={loading || hintLevel > 3}
          >
            {getButtonLabel()} →
          </PillButton>
          <PillButton
            variant="outline"
            style={{ fontSize: '13px', padding: '8px 18px' }}
            onClick={resetAll}
            disabled={loading}
          >
            Reset
          </PillButton>
        </div>
      </footer>
    </>
  );
}
