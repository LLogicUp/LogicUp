import { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { fetchOJLevels, fetchOJProblems } from '../../api/oj';
import type { OJLevelInfo, OJProblemSummary } from '../../api/oj';
import './OJProblemSelector.css';

interface OJProblemSelectorProps {
  selectedProblem: OJProblemSummary | null;
  locked: boolean;
  onProblemChange: (problem: OJProblemSummary | null) => void;
}

export default function OJProblemSelector({
  selectedProblem,
  locked,
  onProblemChange,
}: OJProblemSelectorProps) {
  const [levels, setLevels] = useState<OJLevelInfo[]>([]);
  const [levelsLoading, setLevelsLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<OJLevelInfo | null>(null);
  const [problems, setProblems] = useState<OJProblemSummary[]>([]);
  const [problemsLoading, setProblemLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  useEffect(() => {
    fetchOJLevels()
      .then(setLevels)
      .catch(() => setLevels([]))
      .finally(() => setLevelsLoading(false));
  }, []);

  const handleLevelSelect = async (level: OJLevelInfo) => {
    if (locked) return;
    setSelectedLevel(level);
    setSelectedWeek(null);
    onProblemChange(null);
    setProblemLoading(true);
    try {
      const probs = await fetchOJProblems(level.id);
      setProblems(probs);
    } catch {
      setProblems([]);
    } finally {
      setProblemLoading(false);
    }
  };

  const handleWeekSelect = (week: number) => {
    if (locked) return;
    setSelectedWeek(week);
    onProblemChange(null);
  };

  const handleProblemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    if (!id) {
      onProblemChange(null);
      return;
    }
    const problem = problems.find((p) => p.id === id) ?? null;
    onProblemChange(problem);
  };

  const weekProblems = selectedWeek !== null
    ? problems.filter((p) => p.week === selectedWeek)
    : [];

  return (
    <Card title="OJ 문제 선택">
      <div className="oj-select-row">
        <div>
          <div className="oj-row-label">단계</div>
          {levelsLoading ? (
            <span className="oj-status-text">불러오는 중...</span>
          ) : (
            <div className="oj-tabs">
              {levels.length === 0 ? (
                <span className="oj-status-text">등록된 단계가 없습니다.</span>
              ) : (
                levels.map((level) => (
                  <button
                    key={level.id}
                    className={`oj-tab${selectedLevel?.id === level.id ? ' active' : ''}`}
                    onClick={() => handleLevelSelect(level)}
                    disabled={locked}
                  >
                    {level.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {selectedLevel && (
          <div>
            <div className="oj-row-label">주차</div>
            <div className="oj-tabs">
              {selectedLevel.weeks.map((week) => (
                <button
                  key={week}
                  className={`oj-tab${selectedWeek === week ? ' active' : ''}`}
                  onClick={() => handleWeekSelect(week)}
                  disabled={locked}
                >
                  {week}주차
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedWeek !== null && (
          <div>
            <div className="oj-row-label">문제</div>
            {problemsLoading ? (
              <span className="oj-status-text">불러오는 중...</span>
            ) : weekProblems.length === 0 ? (
              <span className="oj-status-text">이번 주차에 등록된 문제가 없습니다.</span>
            ) : (
              <select
                className="oj-problem-select"
                value={selectedProblem?.id ?? ''}
                onChange={handleProblemSelect}
                disabled={locked}
              >
                <option value="">문제를 선택하세요</option>
                {weekProblems.map((p, i) => (
                  <option key={p.id} value={p.id}>
                    #{i + 1} · {p.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {selectedProblem && (
          <div className="oj-selected-badge">
            <span className="oj-selected-label">선택된 문제</span>
            <span className="oj-selected-title">{selectedProblem.title}</span>
            {!locked && (
              <button
                className="oj-selected-clear"
                onClick={() => onProblemChange(null)}
                aria-label="문제 선택 해제"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
