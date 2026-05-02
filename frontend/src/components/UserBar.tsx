import { useEffect, useState } from 'react';
import { fetchSubmissionList, UnauthorizedError } from '../api/history';
import './UserBar.css';

interface UserBarProps {
  userid: string;
  onUnauthorized: () => void;
}

export default function UserBar({ userid, onUnauthorized }: UserBarProps) {
  const [totalCount, setTotalCount] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchSubmissionList()
      .then((res) => { if (!controller.signal.aborted) setTotalCount(res.items.length); })
      .catch((err) => { if (!controller.signal.aborted && err instanceof UnauthorizedError) onUnauthorized(); });
    return () => controller.abort();
  }, [onUnauthorized]);

  return (
    <section className="lu-user-bar">
      <div className="lu-user-bar__info">
        <span className="lu-user-bar__name">{userid}</span>
      </div>

      <div className="lu-user-bar__stats">
        <div className="lu-user-bar__stat-icon">📚</div>
        <div className="lu-user-bar__stat-rows">
          <div className="lu-user-bar__stat-row">
            <span className="lu-user-bar__stat-lbl">총 제출</span>
            <span className="lu-user-bar__stat-val">
              {totalCount !== null ? totalCount : '—'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
