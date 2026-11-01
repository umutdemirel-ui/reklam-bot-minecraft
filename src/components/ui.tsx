import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
export function Flame({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 64" fill="currentColor" aria-hidden="true">
      <path d="M27 0C33 19 8 23 8 43c0 12 8 21 19 21C5 47 38 42 28 25c22 18 19 34 7 39C59 56 50 28 39 18c3 15-6 17-6 17C40 17 31 9 27 0Z" />
    </svg>
  );
}
export function Icon({ icon: I, size = 18 }: { icon: LucideIcon; size?: number }) {
  return <I size={size} strokeWidth={1.65} />;
}
export function Button({
  children,
  onClick,
  secondary,
  disabled,
  className = '',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${secondary ? 'button-secondary' : 'button-primary'} ${className}`}
    >
      {children}
    </button>
  );
}
export function Toggle({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <label className="setting-row">
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input
        className="switch-input"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}
export function EmptyState({
  icon: I,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <I size={28} strokeWidth={1.4} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
