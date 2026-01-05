'use client';

import { useState, useRef, useEffect, ReactNode, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

// Context for accordion group (only one open at a time)
interface AccordionGroupContextValue {
  openId: string | null;
  setOpenId: (id: string | null) => void;
}

const AccordionGroupContext = createContext<AccordionGroupContextValue | null>(null);

interface AccordionGroupProps {
  children: ReactNode;
  exclusive?: boolean;
}

export function AccordionGroup({ children, exclusive = true }: AccordionGroupProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!exclusive) {
    return <div className="space-y-3 my-6">{children}</div>;
  }

  return (
    <AccordionGroupContext.Provider value={{ openId, setOpenId }}>
      <div className="space-y-3 my-6">{children}</div>
    </AccordionGroupContext.Provider>
  );
}

interface AccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  id?: string;
}

export function Accordion({
  title,
  children,
  defaultOpen = false,
  id,
}: AccordionProps) {
  const groupContext = useContext(AccordionGroupContext);
  const accordionId = id || title.toLowerCase().replace(/\s+/g, '-');

  // Local state for standalone accordion
  const [localOpen, setLocalOpen] = useState(defaultOpen);

  // Use group state if available, otherwise local state
  const isOpen = groupContext
    ? groupContext.openId === accordionId
    : localOpen;

  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(
    defaultOpen ? undefined : 0
  );

  // Update height when content changes
  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen, children]);

  const toggle = () => {
    if (groupContext) {
      groupContext.setOpenId(isOpen ? null : accordionId);
    } else {
      setLocalOpen(!localOpen);
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border transition-colors',
        isOpen
          ? 'border-[var(--accent)] bg-[var(--bg-secondary)]'
          : 'border-[var(--border)] bg-transparent hover:border-[var(--text-muted)]'
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${accordionId}`}
        className={cn(
          'flex items-center justify-between w-full px-4 py-3 text-left',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 rounded-lg'
        )}
      >
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {title}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-[var(--text-muted)] transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <div
        id={`accordion-content-${accordionId}`}
        style={{ height: height === undefined ? 'auto' : height }}
        className="overflow-hidden transition-[height] duration-200 ease-out"
      >
        <div ref={contentRef} className="px-4 pb-4">
          <div className="text-sm text-[var(--text-secondary)] prose-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
