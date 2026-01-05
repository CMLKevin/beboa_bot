'use client';

import { ReactNode, Children, isValidElement } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StepsProps {
  children: ReactNode;
}

export function Steps({ children }: StepsProps) {
  const childArray = Children.toArray(children).filter(isValidElement);

  return (
    <div className="my-8 relative">
      {/* Connecting line */}
      <div
        className="absolute left-[15px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-[var(--accent)] via-[var(--border)] to-[var(--border)]"
        aria-hidden="true"
      />

      <div className="space-y-0">
        {childArray.map((child, index) => {
          if (isValidElement<StepProps>(child) && child.type === Step) {
            return (
              <Step
                key={index}
                {...child.props}
                stepNumber={index + 1}
                isLast={index === childArray.length - 1}
              />
            );
          }
          return child;
        })}
      </div>
    </div>
  );
}

interface StepProps {
  title: string;
  children: ReactNode;
  stepNumber?: number;
  isLast?: boolean;
  status?: 'upcoming' | 'current' | 'complete';
}

export function Step({
  title,
  children,
  stepNumber = 1,
  isLast = false,
  status = 'upcoming',
}: StepProps) {
  return (
    <div className={cn('relative pl-12', !isLast && 'pb-8')}>
      {/* Step indicator */}
      <div
        className={cn(
          'absolute left-0 flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold',
          'border-2 transition-colors',
          status === 'complete' && 'bg-[var(--accent)] border-[var(--accent)] text-white',
          status === 'current' && 'bg-[var(--bg-primary)] border-[var(--accent)] text-[var(--accent)]',
          status === 'upcoming' && 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-muted)]'
        )}
      >
        {status === 'complete' ? (
          <Check className="w-4 h-4" />
        ) : (
          stepNumber
        )}
      </div>

      {/* Content */}
      <div>
        <h4 className="text-base font-semibold text-[var(--text-primary)] mb-2 mt-0.5">
          {title}
        </h4>
        <div className="text-[var(--text-secondary)] text-sm prose-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
