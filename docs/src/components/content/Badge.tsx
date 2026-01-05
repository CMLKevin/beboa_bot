import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'default'
  | 'new'
  | 'required'
  | 'optional'
  | 'experimental'
  | 'deprecated'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
  new: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  required: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  optional: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  experimental: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400',
  deprecated: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  success: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-sm',
        variantStyles[variant]
      )}
    >
      {children}
    </span>
  );
}

// Type badge specifically for API/config documentation
type TypeValue = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'function';

interface TypeBadgeProps {
  type: TypeValue | string;
}

const typeStyles: Record<TypeValue, string> = {
  string: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  number: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  boolean: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400',
  array: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400',
  object: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  function: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400',
};

export function TypeBadge({ type }: TypeBadgeProps) {
  const style = typeStyles[type as TypeValue] || typeStyles.string;

  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 text-xs font-mono rounded',
        style
      )}
    >
      {type}
    </span>
  );
}
