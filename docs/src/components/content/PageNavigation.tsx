'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { navigation } from '@/config/navigation';

interface NavLink {
  title: string;
  href: string;
}

function getFlatNavigation(): NavLink[] {
  const flat: NavLink[] = [];
  for (const section of navigation) {
    for (const item of section.items) {
      flat.push(item);
    }
  }
  return flat;
}

export function PageNavigation() {
  const pathname = usePathname();
  const flatNav = getFlatNavigation();

  const currentIndex = flatNav.findIndex((item) => {
    if (item.href === '/') {
      return pathname === '/';
    }
    return pathname === item.href || pathname.startsWith(item.href + '/');
  });

  const prev = currentIndex > 0 ? flatNav[currentIndex - 1] : null;
  const next = currentIndex < flatNav.length - 1 ? flatNav[currentIndex + 1] : null;

  if (!prev && !next) return null;

  return (
    <nav className="flex items-center justify-between mt-16 pt-8 border-t border-[var(--border)]">
      {prev ? (
        <Link
          href={prev.href}
          className="group flex items-center gap-2 px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] hover:shadow-soft transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
          <div className="text-left">
            <div className="text-xs text-[var(--text-muted)] mb-0.5">Previous</div>
            <div className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
              {prev.title}
            </div>
          </div>
        </Link>
      ) : (
        <div />
      )}

      {next ? (
        <Link
          href={next.href}
          className="group flex items-center gap-2 px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] hover:shadow-soft transition-all"
        >
          <div className="text-right">
            <div className="text-xs text-[var(--text-muted)] mb-0.5">Next</div>
            <div className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
              {next.title}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
