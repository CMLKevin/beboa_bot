import { AlertCircle, Info, Lightbulb, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type CalloutType = 'tip' | 'info' | 'warning' | 'danger';

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
}

const calloutConfig = {
  tip: {
    icon: Lightbulb,
    title: 'Tip',
    className: 'bg-[var(--accent-light)] border-[var(--accent)]',
    iconClassName: 'text-[var(--accent)]',
  },
  info: {
    icon: Info,
    title: 'Info',
    className: 'bg-blue-50 dark:bg-blue-950/30 border-blue-500',
    iconClassName: 'text-blue-500',
  },
  warning: {
    icon: AlertTriangle,
    title: 'Warning',
    className: 'bg-amber-50 dark:bg-amber-950/30 border-amber-500',
    iconClassName: 'text-amber-500',
  },
  danger: {
    icon: AlertCircle,
    title: 'Danger',
    className: 'bg-red-50 dark:bg-red-950/30 border-red-500',
    iconClassName: 'text-red-500',
  },
};

export function Callout({ type = 'tip', title, children }: CalloutProps) {
  const config = calloutConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'my-6 rounded-lg border-l-4 p-4',
        config.className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', config.iconClassName)} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--text-primary)] mb-1">
            {title || config.title}
          </p>
          <div className="text-[var(--text-secondary)] text-sm prose-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
