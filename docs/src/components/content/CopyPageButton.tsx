'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyPageButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Get page content from the article element
      const article = document.querySelector('article');
      if (article) {
        const text = article.innerText;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-md transition-colors border border-transparent hover:border-[var(--border)]"
      title="Copy page content"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
      <span>{copied ? 'Copied!' : 'Copy page'}</span>
    </button>
  );
}
