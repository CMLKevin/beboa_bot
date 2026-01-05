'use client';

import { Search } from 'lucide-react';

interface SearchTriggerProps {
  onClick: () => void;
}

export function SearchTrigger({ onClick }: SearchTriggerProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-muted)] bg-[var(--bg-tertiary)] hover:bg-[var(--border)] rounded-lg border border-[var(--border)] transition-colors w-full max-w-[240px]"
    >
      <Search className="w-4 h-4" />
      <span className="flex-1 text-left">Search docs...</span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-secondary)] rounded border border-[var(--border)]">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
