'use client';

import { useState, useMemo } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  children: string;
  language?: string;
  filename?: string;
  highlight?: string; // e.g., "1,3-5,8"
  showLineNumbers?: boolean;
  diff?: boolean;
}

// Parse highlight string like "1,3-5,8" into Set of line numbers
function parseHighlight(highlight: string | undefined): Set<number> {
  if (!highlight) return new Set();

  const lines = new Set<number>();
  const parts = highlight.split(',');

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) {
        lines.add(i);
      }
    } else {
      lines.add(Number(part));
    }
  }

  return lines;
}

// Detect if line is a diff addition/removal
function getDiffType(line: string): 'add' | 'remove' | null {
  if (line.startsWith('+') && !line.startsWith('+++')) return 'add';
  if (line.startsWith('-') && !line.startsWith('---')) return 'remove';
  return null;
}

export function CodeBlock({
  children,
  language,
  filename,
  highlight,
  showLineNumbers = false,
  diff = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightedLines = useMemo(() => parseHighlight(highlight), [highlight]);

  const lines = children.split('\n');
  // Remove trailing empty line if present
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }

  const isDiff = diff || language === 'diff';
  const hasHeader = !!(language || filename);

  return (
    <div className="relative group my-6">
      {/* Header */}
      {hasHeader && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] dark:bg-[#1a1a1a] border-b border-[#3d3d3d] rounded-t-lg">
          <span className="text-xs font-medium text-[#9a9a9a]">
            {filename || language}
          </span>
          <button
            onClick={handleCopy}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-all',
              copied
                ? 'bg-green-500/20 text-green-400'
                : 'bg-[#3d3d3d] text-[#9a9a9a] hover:bg-[#4d4d4d] hover:text-white'
            )}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Code */}
      <pre
        className={cn(
          'overflow-x-auto text-sm',
          'bg-[var(--code-bg)] text-[var(--code-text)]',
          hasHeader ? 'rounded-b-lg rounded-t-none' : 'rounded-lg',
          showLineNumbers ? 'pl-0' : 'p-4'
        )}
      >
        <code className="font-mono block">
          {lines.map((line, index) => {
            const lineNumber = index + 1;
            const isHighlighted = highlightedLines.has(lineNumber);
            const diffType = isDiff ? getDiffType(line) : null;

            return (
              <div
                key={index}
                className={cn(
                  'px-4',
                  isHighlighted && 'bg-[var(--accent)]/10 border-l-2 border-[var(--accent)]',
                  diffType === 'add' && 'bg-green-500/15 text-green-400',
                  diffType === 'remove' && 'bg-red-500/15 text-red-400'
                )}
              >
                {showLineNumbers && (
                  <span className="inline-block w-8 mr-4 text-right text-[#666] select-none">
                    {lineNumber}
                  </span>
                )}
                <span>{line || ' '}</span>
              </div>
            );
          })}
        </code>
      </pre>

      {/* Copy button for code blocks without header */}
      {!hasHeader && (
        <button
          onClick={handleCopy}
          className={cn(
            'absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-all',
            'opacity-0 group-hover:opacity-100',
            copied
              ? 'bg-green-500/20 text-green-400'
              : 'bg-[#3d3d3d] text-[#9a9a9a] hover:bg-[#4d4d4d] hover:text-white'
          )}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
