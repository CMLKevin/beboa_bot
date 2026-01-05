'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Sun, Moon, Github } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { navigation, topTabs, getActiveTab, siteConfig } from '@/config/navigation';
import { cn } from '@/lib/utils';
import { SearchTrigger } from '@/components/search/SearchTrigger';
import { SearchDialog } from '@/components/search/SearchDialog';
import { useSearch } from '@/hooks/useSearch';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const { isOpen: isSearchOpen, openSearch, closeSearch } = useSearch();

  const activeTab = getActiveTab(pathname);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Main Header */}
      <header className="sticky top-0 z-40 w-full h-[var(--header-height)] bg-[var(--bg-secondary)] border-b border-[var(--border)]">
        <div className="flex items-center justify-between h-full px-4 lg:px-6">
          {/* Left: Logo + Tabs */}
          <div className="flex items-center gap-6">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
            >
              <span className="text-xl">🐍</span>
              <span className="hidden sm:inline">{siteConfig.name}</span>
              <span className="hidden sm:inline text-xs font-normal text-[var(--text-muted)] ml-1">
                Docs
              </span>
            </Link>

            {/* Desktop Tabs */}
            <nav className="hidden lg:flex items-center gap-1">
              {topTabs.map((tab) => (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={cn(
                    'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    activeTab.id === tab.id
                      ? 'text-[var(--accent)] bg-[var(--accent-light)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  )}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right: Search + Utils */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden sm:block">
              <SearchTrigger onClick={openSearch} />
            </div>

            {/* Mobile Search Button */}
            <button
              onClick={openSearch}
              className="sm:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* GitHub */}
            <a
              href={siteConfig.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Search Dialog */}
      <SearchDialog open={isSearchOpen} onClose={closeSearch} />

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-[var(--bg-secondary)] border-r border-[var(--border)] transform transition-transform duration-300 ease-in-out lg:hidden',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile Menu Header */}
        <div className="flex items-center justify-between h-[var(--header-height)] px-4 border-b border-[var(--border)]">
          <Link
            href="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]"
          >
            <span className="text-xl">🐍</span>
            <span>{siteConfig.name}</span>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 -mr-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Tabs */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex flex-wrap gap-2">
            {topTabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  activeTab.id === tab.id
                    ? 'text-[var(--accent)] bg-[var(--accent-light)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-tertiary)]'
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="overflow-y-auto h-[calc(100%-128px)] py-4 px-4">
          <ul className="space-y-1">
            {navigation.map((section) => (
              <li key={section.title} className="mb-4">
                <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {section.title}
                </div>
                <ul className="mt-1 space-y-1">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          'block px-3 py-2 rounded-md text-sm transition-colors',
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
    </>
  );
}
