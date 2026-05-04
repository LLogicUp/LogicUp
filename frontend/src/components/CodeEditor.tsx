import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  isDark: boolean;
  locked?: boolean;
  onCodeChange: (value: string) => void;
}

function CodeEditor({ code, isDark, locked = false, onCodeChange }: CodeEditorProps) {
  return (
    <>
      <h2>Code Input</h2>
      <Editor
        height="400px"
        defaultLanguage="c"
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
