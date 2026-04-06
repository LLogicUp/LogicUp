import ReactMarkdown from 'react-markdown';

export interface Hint {
  level: number;
  explanation: string;
  pseudocode: string;
}

interface HintPanelProps {
  hints: Hint[];
}

function HintPanel({ hints }: HintPanelProps) {
  return (
    <div className="hint-display">
      <h2>Hint</h2>
      <div className="hint-content">
        {hints.length > 0 ? (
          hints.map((hint) => (
            <div key={hint.level} className="hint-item">
              <span className="hint-level-badge">{hint.level}단계 힌트</span>
              <div className="hint-markdown">
                <ReactMarkdown>{hint.explanation}</ReactMarkdown>
              </div>
              {hint.pseudocode && (
                <div className="hint-pseudocode">
                  <h3>의사코드</h3>
                  <div className="hint-markdown">
                    <ReactMarkdown>{hint.pseudocode}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="hint-placeholder">코드를 입력하고 힌트를 요청하세요.</p>
        )}
      </div>
    </div>
  );
}

export default HintPanel;
