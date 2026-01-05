import Link from 'next/link';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Rocket,
  Brain,
  Terminal,
  Database,
  Settings,
  Code,
  Zap,
  Heart,
  Shield,
  BookOpen,
  Users,
  MessageSquare,
  Sparkles,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';

// Icon mapping for MDX usage
const iconMap: Record<string, LucideIcon> = {
  rocket: Rocket,
  brain: Brain,
  terminal: Terminal,
  database: Database,
  settings: Settings,
  code: Code,
  zap: Zap,
  heart: Heart,
  shield: Shield,
  book: BookOpen,
  users: Users,
  message: MessageSquare,
  sparkles: Sparkles,
};

interface CardProps {
  title: string;
  children: ReactNode;
  icon?: string;
  href?: string;
  variant?: 'default' | 'outline' | 'ghost';
}

export function Card({
  title,
  children,
  icon,
  href,
  variant = 'default',
}: CardProps) {
  const Icon = icon ? iconMap[icon] : null;

  const cardContent = (
    <div
      className={cn(
        'group relative rounded-lg p-5 transition-all duration-200',
        variant === 'default' && [
          'bg-[var(--bg-secondary)] border border-[var(--border)]',
          'hover:border-[var(--accent)] hover:shadow-soft',
          href && 'hover:-translate-y-0.5',
        ],
        variant === 'outline' && [
          'border-2 border-[var(--border)]',
          'hover:border-[var(--accent)]',
        ],
        variant === 'ghost' && [
          'hover:bg-[var(--bg-secondary)]',
        ]
      )}
    >
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="flex-shrink-0 p-2 rounded-lg bg-[var(--accent-light)]">
            <Icon className="w-5 h-5 text-[var(--accent)]" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5 flex items-center gap-2">
            {title}
            {href && (
              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[var(--accent)]" />
            )}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {children}
          </p>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block no-underline">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

interface CardGroupProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
}

export function CardGroup({ children, cols = 2 }: CardGroupProps) {
  return (
    <div
      className={cn(
        'grid gap-4 my-6 not-prose',
        cols === 1 && 'grid-cols-1',
        cols === 2 && 'grid-cols-1 md:grid-cols-2',
        cols === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        cols === 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
      )}
    >
      {children}
    </div>
  );
}
