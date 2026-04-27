interface AnswerInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

function AnswerInput({ value, onChange, onSubmit, disabled }: AnswerInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !disabled) onSubmit();
  };

  return (
    <div className="quiz-answer-input">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="답을 입력하세요"
        disabled={disabled}
        autoFocus
      />
    </div>
  );
}

export default AnswerInput;
