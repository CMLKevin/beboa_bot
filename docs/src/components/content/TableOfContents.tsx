'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Heading {
  id: string;
  text: string;
  level: number;
}

export function TableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // Get all headings from the content
    const elements = document.querySelectorAll('h2, h3');
    const headingList: Heading[] = [];

    elements.forEach((element) => {
      const id = element.id;
      if (id) {
        headingList.push({
          id,
          text: element.textContent || '',
          level: parseInt(element.tagName[1]),
        });
      }
    });

    setHeadings(headingList);

    // Set up intersection observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-80px 0px -80% 0px',
        threshold: 0,
      }
    );

    elements.forEach((element) => {
      if (element.id) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  if (headings.length === 0) return null;

  return (
    <nav className="hidden xl:block fixed right-8 top-32 w-56">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">
        On this page
      </h4>
      <ul className="space-y-2 text-sm">
        {headings.map((heading) => (
          <li
            key={heading.id}
            style={{ paddingLeft: heading.level === 3 ? '0.75rem' : '0' }}
          >
            <a
              href={`#${heading.id}`}
              className={cn(
                'block py-1 transition-colors',
                activeId === heading.id
                  ? 'text-[var(--accent)] font-medium'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
