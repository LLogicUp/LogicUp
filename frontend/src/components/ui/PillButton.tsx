import type { ButtonHTMLAttributes } from 'react';
import './PillButton.css';

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
}

export default function PillButton({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: PillButtonProps) {
  return (
    <button className={`lu-pill lu-pill--${variant} ${className}`} {...rest}>
      {children}
    </button>
  );
}
