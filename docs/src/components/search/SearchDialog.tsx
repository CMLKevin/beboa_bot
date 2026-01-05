'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, FileText, ArrowRight } from 'lucide-react';
import { navigation } from '@/config/navigation';

interface SearchResult {
  title: string;
  href: string;
  section: string;
  description?: string;
}

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Build search index from navigation
  const getAllPages = useCallback((): SearchResult[] => {
    const pages: SearchResult[] = [];
    for (const section of navigation) {
      for (const item of section.items) {
        pages.push({
          title: item.title,
          href: item.href,
          section: section.title,
        });
      }
    }
    return pages;
  }, []);

  // Perform search
  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const allPages = getAllPages();
    const query = searchQuery.toLowerCase();

    const filtered = allPages.filter(
      (page) =>
        page.title.toLowerCase().includes(query) ||
        page.section.toLowerCase().includes(query)
    );

    // Sort by relevance (title matches first)
    filtered.sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      const aStartsWithQuery = aTitle.startsWith(query);
      const bStartsWithQuery = bTitle.startsWith(query);

      if (aStartsWithQuery && !bStartsWithQuery) return -1;
      if (!aStartsWithQuery && bStartsWithQuery) return 1;
      return 0;
    });

    setResults(filtered.slice(0, 8));
    setSelectedIndex(0);
  }, [getAllPages]);

  // Handle query change
  useEffect(() => {
    performSearch(query);
  }, [query, performSearch]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            router.push(results[selectedIndex].href);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results, selectedIndex, router, onClose]
  );

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-xl bg-[var(--bg-secondary)] rounded-xl shadow-lg border border-[var(--border)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b border-[var(--border)]">
          <Search className="w-5 h-5 text-[var(--text-muted)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search documentation..."
            className="flex-1 py-4 text-base bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
          />
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query && results.length === 0 ? (
            <div className="px-4 py-8 text-center text-[var(--text-muted)]">
              No results found for &quot;{query}&quot;
            </div>
          ) : results.length > 0 ? (
            <ul className="py-2">
              {results.map((result, index) => (
                <li key={result.href}>
                  <button
                    onClick={() => {
                      router.push(result.href);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-[var(--accent-light)]'
                        : 'hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <FileText
                      className={`w-5 h-5 ${
                        index === selectedIndex
                          ? 'text-[var(--accent)]'
                          : 'text-[var(--text-muted)]'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium ${
                          index === selectedIndex
                            ? 'text-[var(--accent)]'
                            : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {result.title}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] truncate">
                        {result.section}
                      </div>
                    </div>
                    {index === selectedIndex && (
                      <ArrowRight className="w-4 h-4 text-[var(--accent)]" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6">
              <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-3">
                Quick Links
              </div>
              <ul className="space-y-1">
                {navigation.slice(0, 3).flatMap((section) =>
                  section.items.slice(0, 2).map((item) => (
                    <li key={item.href}>
                      <button
                        onClick={() => {
                          router.push(item.href);
                          onClose();
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-md transition-colors"
                      >
                        <FileText className="w-4 h-4 text-[var(--text-muted)]" />
                        {item.title}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-tertiary)]">
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded border border-[var(--border)]">
                ↑↓
              </kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded border border-[var(--border)]">
                ↵
              </kbd>
              to select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded border border-[var(--border)]">
                esc
              </kbd>
              to close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
