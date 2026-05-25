import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PillButton from '../components/ui/PillButton';
import ProblemInput, { OJ_SUBJECT_LABELS, type OjSubject } from '../components/ProblemInput';
import CodeEditor, { type CodeLanguage } from '../components/CodeEditor';
import HintPanel, { type Hint } from '../components/HintPanel';
import { postHint } from '../api/hint';
import type { HintApiResponse } from '../api/hint';
import { fetchOjIndex, fetchOjProblem, SejongRequiredError, type OjProblemDetail, type OjSubjectSummary } from '../api/oj';

type Source = 'direct' | 'url' | 'oj';

interface EditorPageProps {
  isDark: boolean;
  isSejongVerified: boolean;
  onLogout: () => void;
}

export default function EditorPage({ isDark, isSejongVerified, onLogout }: EditorPageProps) {
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
  const [ojSubjects, setOjSubjects] = useState<OjSubjectSummary[]>([]);
  const [ojLoading, setOjLoading] = useState(false);
  const [ojError, setOjError] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<CodeLanguage>('c');
  const [hints, setHints] = useState<Hint[]>([]);
  const [hintLevel, setHintLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submissionId, setSubmissionId] = useState<number | null>(null);

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

  useEffect(() => {
    if (source !== 'oj' || !isSejongVerified) return;

    let cancelled = false;
    setOjLoading(true);
    setOjError('');
    fetchOjIndex()
      .then((subjects) => {
        if (cancelled) return;
        setOjSubjects(subjects);
        if (subjects.length > 0 && !subjects.some((subject) => subject.key === ojSubject)) {
          setOjSubject(subjects[0].key);
          setOjChapter('');
          setOjProblemNumber('');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof Error && err.message === 'Unauthorized') {
          onLogout();
          return;
        }
        if (err instanceof SejongRequiredError) {
          setOjError('세종대 로그인 후 사용할 수 있습니다.');
          return;
        }
        setOjError('OJ 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setOjLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [source, ojSubject, isSejongVerified, onLogout]);

  const selectedOjSubject = ojSubjects.find((subject) => subject.key === ojSubject);
  const ojChapterOptions = selectedOjSubject?.chapters ?? [];
  const selectedOjChapter = ojChapterOptions.find((chapter) => String(chapter.chapter) === ojChapter);
  const ojProblemOptions = selectedOjChapter?.problems ?? [];
  const selectedOjProblem = ojProblemOptions.find((problem) => String(problem.number) === ojProblemNumber);

  const handleOjSubjectChange = (value: OjSubject) => {
    setOjSubject(value);
    setOjChapter('');
    setOjProblemNumber('');
  };

  const handleOjChapterChange = (value: string) => {
    setOjChapter(value);
    setOjProblemNumber('');
  };

  const buildOjProblemText = (detail?: OjProblemDetail) => {
    return [
      'OJ 문제 조회 정보',
      `과목: ${selectedOjSubject?.label ?? OJ_SUBJECT_LABELS[ojSubject] ?? ojSubject} (${ojSubject})`,
      `장: ${ojChapter || '미입력'}`,
      `문제 번호: ${ojProblemNumber || '미입력'}`,
      `문제 제목: ${detail?.title || selectedOjProblem?.title || '미입력'}`,
      '',
      '문제 설명:',
      detail?.description || '',
    ].join('\n');
  };

  const buildOjExpectedInput = (detail: OjProblemDetail) => {
    return detail.examples.map((example, index) => (
      detail.examples.length > 1
        ? `예시 ${index + 1}\n${example.input}`
        : example.input
    )).join('\n\n');
  };

  const buildOjExpectedOutput = (detail: OjProblemDetail) => {
    return detail.examples.map((example, index) => (
      detail.examples.length > 1
        ? `예시 ${index + 1}\n${example.output}`
        : example.output
    )).join('\n\n');
  };

  const requestHint = async () => {
    if (!code.trim()) return;
    if (source === 'oj' && !isSejongVerified) return;
    if (source === 'oj' && (!ojSubject || !ojChapter || !ojProblemNumber)) return;
    setLoading(true);
    try {
      const ojProblem = source === 'oj' && ojSubject && ojChapter && ojProblemNumber
        ? await fetchOjProblem(ojSubject, ojChapter, ojProblemNumber)
        : undefined;

      const data: HintApiResponse = await postHint({
        submission_id: submissionId,
        source,
        ...(source === 'url'
          ? { problem_url: problemUrl }
          : source === 'oj'
            ? {
                problem: buildOjProblemText(ojProblem),
                expected_input: ojProblem ? buildOjExpectedInput(ojProblem) : '',
                expected_output: ojProblem ? buildOjExpectedOutput(ojProblem) : '',
              }
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
      if (
        err instanceof SejongRequiredError ||
        (err instanceof Error && err.message === 'SejongRequired')
      ) {
        setHints((prev) => [
          ...prev,
          {
            level: hintLevel,
            explanation: 'OJ 힌트는 세종대 로그인 후 사용할 수 있습니다.',
            pseudocode: '',
          },
        ]);
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

  const isHintDisabled =
    loading ||
    hintLevel > 3 ||
    !code.trim() ||
    (source === 'oj' && !isSejongVerified) ||
    (source === 'oj' && (!ojSubject || !ojChapter || !ojProblemNumber));

  const ojSelectionLabel = [
    selectedOjSubject?.label ?? OJ_SUBJECT_LABELS[ojSubject] ?? ojSubject,
    ojChapter ? `${ojChapter}장` : '장 미선택',
    selectedOjProblem
      ? `${selectedOjProblem.number}번 ${selectedOjProblem.title}`
      : ojProblemNumber ? `${ojProblemNumber}번` : '문제 미선택',
  ].join(' · ');

  return (
    <>
      <main className="main-container">
        <div className="code-editor">
          {source === 'oj' && !isSejongVerified ? (
            <div className="oj-mode-summary">
              <span className="oj-mode-summary__tag">OJ</span>
              <span className="oj-mode-summary__text">세종대 로그인 후 사용할 수 있습니다.</span>
            </div>
          ) : (
            <>
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
            ojSubjectOptions={ojSubjects}
            ojChapterOptions={ojChapterOptions}
            ojProblemOptions={ojProblemOptions}
            ojLoading={ojLoading}
            ojError={ojError}
            locked={hints.length > 0}
            onProblemChange={setProblem}
            onExpectedInputChange={setExpectedInput}
            onExpectedOutputChange={setExpectedOutput}
            onProblemUrlChange={setProblemUrl}
            onOjSubjectChange={handleOjSubjectChange}
            onOjChapterChange={handleOjChapterChange}
            onOjProblemNumberChange={setOjProblemNumber}
          />
            </>
          )}
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
            disabled={isHintDisabled}
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
