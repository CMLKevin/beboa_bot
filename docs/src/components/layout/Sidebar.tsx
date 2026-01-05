'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navigation, getActiveTab, getSectionsForTab } from '@/config/navigation';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);
  const sections = getSectionsForTab(activeTab.id);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname === href;
  };

  return (
    <aside className="hidden lg:block fixed top-[var(--header-height)] left-0 bottom-0 w-[var(--sidebar-width)] border-r border-[var(--border)] bg-[var(--bg-secondary)] overflow-y-auto">
      <nav className="py-6 px-4">
        <ul className="space-y-6">
          {sections.map((section) => (
            <li key={section.title}>
              {/* Section Header */}
              <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {section.title}
              </div>

              {/* Section Items */}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'block px-3 py-1.5 rounded-md text-sm transition-colors',
                        isActive(item.href)
                          ? 'text-[var(--accent)] bg-[var(--accent-light)] font-medium'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                      )}
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
