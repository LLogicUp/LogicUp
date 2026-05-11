import Editor from '@monaco-editor/react';

export type CodeLanguage = 'c' | 'cpp' | 'python' | 'java';

const LANGUAGE_OPTIONS: Array<{ value: CodeLanguage; label: string }> = [
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
];

interface CodeEditorProps {
  code: string;
  isDark: boolean;
  language: CodeLanguage;
  locked?: boolean;
  onCodeChange: (value: string) => void;
  onLanguageChange: (value: CodeLanguage) => void;
}

function CodeEditor({
  code,
  isDark,
  language,
  locked = false,
  onCodeChange,
  onLanguageChange,
}: CodeEditorProps) {
  return (
    <>
      <div className="code-editor-header">
        <h2>Code Input</h2>
        <label className="language-select">
          <span>Language</span>
          <select
            value={language}
            disabled={locked}
            onChange={(event) => onLanguageChange(event.target.value as CodeLanguage)}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Editor
        height="400px"
        language={language}
        value={code}
        onChange={(value) => onCodeChange(value ?? '')}
        theme={isDark ? 'vs-dark' : 'light'}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          scrollBeyondLastLine: false,
          readOnly: locked,
        }}
      />
    </>
  );
}

export default CodeEditor;
