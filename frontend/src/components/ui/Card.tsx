import type { ReactNode } from 'react';
import './Card.css';

interface CardProps {
  title?: string;
  onPlus?: () => void;
  children: ReactNode;
  className?: string;
}

export default function Card({ title, onPlus, children, className = '' }: CardProps) {
  return (
    <section className={`lu-card ${className}`}>
      {title && (
        <div className="lu-card__header">
          <h2 className="lu-card__title">{title}</h2>
          {onPlus && (
            <button className="lu-card__plus" onClick={onPlus} aria-label="추가">＋</button>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
