'use client';

import { useState, useRef, useEffect, createContext, useContext, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Context for managing tab state
interface TabsContextValue {
  activeTab: number;
  setActiveTab: (index: number) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

// Storage key for persisting tab selection
const getStorageKey = (items: string[]) => `tabs-${items.join('-')}`;

interface TabsProps {
  items: string[];
  children: ReactNode;
  defaultIndex?: number;
  persist?: boolean;
}

export function Tabs({ items, children, defaultIndex = 0, persist = true }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultIndex);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Restore persisted tab selection
  useEffect(() => {
    if (persist && typeof window !== 'undefined') {
      const stored = localStorage.getItem(getStorageKey(items));
      if (stored !== null) {
        const index = parseInt(stored, 10);
        if (index >= 0 && index < items.length) {
          setActiveTab(index);
        }
      }
    }
  }, [items, persist]);

  // Update indicator position
  useEffect(() => {
    const activeTabEl = tabRefs.current[activeTab];
    if (activeTabEl && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const tabRect = activeTabEl.getBoundingClientRect();
      setIndicatorStyle({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      });
    }
  }, [activeTab]);

  // Persist selection
  const handleTabChange = (index: number) => {
    setActiveTab(index);
    if (persist && typeof window !== 'undefined') {
      localStorage.setItem(getStorageKey(items), index.toString());
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const newIndex = index === 0 ? items.length - 1 : index - 1;
      handleTabChange(newIndex);
      tabRefs.current[newIndex]?.focus();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const newIndex = index === items.length - 1 ? 0 : index + 1;
      handleTabChange(newIndex);
      tabRefs.current[newIndex]?.focus();
    }
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div className="my-6">
        {/* Tab buttons */}
        <div
          ref={containerRef}
          className="relative flex gap-0 border-b border-[var(--border)] overflow-x-auto"
          role="tablist"
        >
          {items.map((item, index) => (
            <button
              key={item}
              ref={(el) => { tabRefs.current[index] = el; }}
              role="tab"
              aria-selected={activeTab === index}
              aria-controls={`tabpanel-${index}`}
              tabIndex={activeTab === index ? 0 : -1}
              onClick={() => handleTabChange(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
                activeTab === index
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              {item}
            </button>
          ))}
          {/* Animated underline indicator */}
          <div
            className="absolute bottom-0 h-0.5 bg-[var(--accent)] transition-all duration-200 ease-out"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
            }}
          />
        </div>

        {/* Tab panels */}
        <div className="mt-4">
          {children}
        </div>
      </div>
    </TabsContext.Provider>
  );
}

interface TabProps {
  children: ReactNode;
  index?: number;
}

export function Tab({ children, index = 0 }: TabProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tab must be used within Tabs');
  }

  const { activeTab } = context;

  if (activeTab !== index) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      className="animate-fade-in"
    >
      {children}
    </div>
  );
}

// Helper component for auto-indexed tabs
interface TabContentProps {
  children: ReactNode[];
}

export function TabContent({ children }: TabContentProps) {
  return (
    <>
      {children.map((child, index) => (
        <Tab key={index} index={index}>
          {child}
        </Tab>
      ))}
    </>
  );
}
