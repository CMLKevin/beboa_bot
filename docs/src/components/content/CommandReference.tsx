'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge, TypeBadge } from './Badge';
import { Check, Copy, ChevronDown, Clock, Shield, Terminal } from 'lucide-react';

interface CommandOption {
  name: string;
  type: string;
  required?: boolean;
  description: string;
  choices?: string[];
}

interface CommandReferenceProps {
  name: string;
  description: string;
  options?: CommandOption[];
  permissions?: string;
  cooldown?: string;
  examples?: string[];
  aliases?: string[];
}

export function CommandReference({
  name,
  description,
  options = [],
  permissions = 'Everyone',
  cooldown,
  examples = [],
  aliases = [],
}: CommandReferenceProps) {
  const [copied, setCopied] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const copyCommand = async () => {
    await navigator.clipboard.writeText(name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden not-prose">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 p-4 border-b border-[var(--border)]">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[var(--accent)]" />
              <code className="text-lg font-semibold text-[var(--text-primary)]">
                {name}
              </code>
            </div>
            <button
              onClick={copyCommand}
              className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors"
              aria-label="Copy command"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-[var(--text-muted)]" />
              )}
            </button>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{description}</p>
          {aliases.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-[var(--text-muted)]">Aliases:</span>
              {aliases.map((alias) => (
                <code
                  key={alias}
                  className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded"
                >
                  {alias}
                </code>
              ))}
            </div>
          )}
        </div>

        {/* Metadata badges */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Shield className="w-3.5 h-3.5" />
            <span>{permissions}</span>
          </div>
          {cooldown && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <Clock className="w-3.5 h-3.5" />
              <span>{cooldown}</span>
            </div>
          )}
        </div>
      </div>

      {/* Options */}
      {options.length > 0 && (
        <div className="border-b border-[var(--border)]">
          <button
            onClick={() => setOptionsOpen(!optionsOpen)}
            className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <span className="text-sm font-medium text-[var(--text-primary)]">
              Options ({options.length})
            </span>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-[var(--text-muted)] transition-transform',
                optionsOpen && 'rotate-180'
              )}
            />
          </button>

          {optionsOpen && (
            <div className="px-4 pb-4 space-y-3">
              {options.map((option) => (
                <div
                  key={option.name}
                  className="flex items-start gap-4 p-3 rounded-md bg-[var(--bg-primary)]"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono text-[var(--accent)]">
                        {option.name}
                      </code>
                      <TypeBadge type={option.type} />
                      {option.required && (
                        <Badge variant="required" size="sm">
                          Required
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {option.description}
                    </p>
                    {option.choices && option.choices.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-[var(--text-muted)]">
                          Choices:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {option.choices.map((choice) => (
                            <code
                              key={choice}
                              className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded"
                            >
                              {choice}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Examples */}
      {examples.length > 0 && (
        <div className="p-4">
          <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">
            Examples
          </h4>
          <div className="space-y-2">
            {examples.map((example, index) => (
              <code
                key={index}
                className="block text-sm font-mono text-[var(--text-secondary)] bg-[var(--bg-primary)] px-3 py-2 rounded-md"
              >
                {example}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
