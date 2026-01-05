import Link from 'next/link';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight, ExternalLink } from 'lucide-react';

interface LinkCardProps {
  title: string;
  href: string;
  description?: string;
  external?: boolean;
}

export function LinkCard({
  title,
  href,
  description,
  external = false,
}: LinkCardProps) {
  const isExternal = external || href.startsWith('http');
  const Icon = isExternal ? ExternalLink : ArrowRight;

  const content = (
    <div
      className={cn(
        'group flex items-center justify-between gap-4 p-4 rounded-lg',
        'border border-[var(--border)] bg-[var(--bg-secondary)]',
        'hover:border-[var(--accent)] hover:shadow-soft transition-all',
        'no-underline'
      )}
    >
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors mb-0.5">
          {title}
        </h4>
        {description && (
          <p className="text-xs text-[var(--text-muted)] truncate">
            {description}
          </p>
        )}
      </div>
      <Icon className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors flex-shrink-0" />
    </div>
  );

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

interface LinkCardGroupProps {
  children: ReactNode;
  cols?: 1 | 2;
}

export function LinkCardGroup({ children, cols = 2 }: LinkCardGroupProps) {
  return (
    <div
      className={cn(
        'grid gap-3 my-6 not-prose',
        cols === 1 && 'grid-cols-1',
        cols === 2 && 'grid-cols-1 sm:grid-cols-2'
      )}
    >
      {children}
    </div>
  );
}

// Related section component for end of pages
interface RelatedProps {
  children: ReactNode;
}

export function Related({ children }: RelatedProps) {
  return (
    <div className="mt-12 pt-8 border-t border-[var(--border)]">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 uppercase tracking-wide">
        Related
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {children}
      </div>
    </div>
  );
}
