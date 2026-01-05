'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { navigation } from '@/config/navigation';

interface Breadcrumb {
  title: string;
  href: string;
}

export function Breadcrumbs() {
  const pathname = usePathname();

  // Build breadcrumb trail from pathname
  const getBreadcrumbs = (): Breadcrumb[] => {
    if (pathname === '/') return [];

    const crumbs: Breadcrumb[] = [];

    // Find matching section and item
    for (const section of navigation) {
      for (const item of section.items) {
        if (pathname === item.href || pathname.startsWith(item.href + '/')) {
          // Add section as first crumb
          crumbs.push({
            title: section.title,
            href: section.items[0]?.href || '/',
          });

          // If we're on a specific item page, don't add the item itself
          // (the page title will show it)
          return crumbs;
        }
      }
    }

    return crumbs;
  };

  const crumbs = getBreadcrumbs();

  if (crumbs.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-sm mb-4"
    >
      {crumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center gap-1.5">
          {index > 0 && (
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          )}
          <Link
            href={crumb.href}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            {crumb.title}
          </Link>
        </div>
      ))}
    </nav>
  );
}
