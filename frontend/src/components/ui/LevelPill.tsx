import './LevelPill.css';

interface LevelPillProps {
  level: 1 | 2 | 3;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const LABELS: Record<number, string> = {
  1: 'Lv.1 오류 위치',
  2: 'Lv.2 관련 개념',
  3: 'Lv.3 의사코드',
};

export default function LevelPill({ level, active, disabled, onClick }: LevelPillProps) {
  return (
    <button
      className={`lu-level-pill${active ? ' lu-level-pill--active' : ''}`}
      aria-pressed={active}
      aria-label={`힌트 레벨 ${level}: ${LABELS[level]}`}
      disabled={disabled}
      onClick={onClick}
    >
      {LABELS[level]}
    </button>
  );
}
