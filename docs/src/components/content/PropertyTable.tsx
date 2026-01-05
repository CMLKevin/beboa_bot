import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Badge, TypeBadge } from './Badge';

interface Property {
  name: string;
  type: string;
  required?: boolean;
  default?: string;
  description: string | ReactNode;
}

interface PropertyTableProps {
  properties: Property[];
  showDefaults?: boolean;
}

export function PropertyTable({
  properties,
  showDefaults = true,
}: PropertyTableProps) {
  return (
    <div className="my-6 overflow-x-auto not-prose">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left py-3 px-4 font-semibold text-[var(--text-primary)]">
              Property
            </th>
            <th className="text-left py-3 px-4 font-semibold text-[var(--text-primary)]">
              Type
            </th>
            {showDefaults && (
              <th className="text-left py-3 px-4 font-semibold text-[var(--text-primary)]">
                Default
              </th>
            )}
            <th className="text-left py-3 px-4 font-semibold text-[var(--text-primary)]">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {properties.map((prop, index) => (
            <tr
              key={prop.name}
              className={cn(
                'border-b border-[var(--border)] last:border-0',
                index % 2 === 1 && 'bg-[var(--bg-secondary)]'
              )}
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-[var(--accent)]">
                    {prop.name}
                  </code>
                  {prop.required && (
                    <Badge variant="required" size="sm">
                      Required
                    </Badge>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <TypeBadge type={prop.type} />
              </td>
              {showDefaults && (
                <td className="py-3 px-4">
                  {prop.default ? (
                    <code className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">
                      {prop.default}
                    </code>
                  ) : (
                    <span className="text-[var(--text-muted)]">-</span>
                  )}
                </td>
              )}
              <td className="py-3 px-4 text-[var(--text-secondary)]">
                {prop.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Environment variable table variant
interface EnvVar {
  name: string;
  required?: boolean;
  default?: string;
  description: string;
  example?: string;
}

interface EnvTableProps {
  variables: EnvVar[];
}

export function EnvTable({ variables }: EnvTableProps) {
  return (
    <div className="my-6 overflow-x-auto not-prose">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left py-3 px-4 font-semibold text-[var(--text-primary)]">
              Variable
            </th>
            <th className="text-left py-3 px-4 font-semibold text-[var(--text-primary)]">
              Default
            </th>
            <th className="text-left py-3 px-4 font-semibold text-[var(--text-primary)]">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {variables.map((envVar, index) => (
            <tr
              key={envVar.name}
              className={cn(
                'border-b border-[var(--border)] last:border-0',
                index % 2 === 1 && 'bg-[var(--bg-secondary)]'
              )}
            >
              <td className="py-3 px-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-[var(--accent)]">
                      {envVar.name}
                    </code>
                    {envVar.required && (
                      <Badge variant="required" size="sm">
                        Required
                      </Badge>
                    )}
                  </div>
                  {envVar.example && (
                    <code className="text-xs font-mono text-[var(--text-muted)]">
                      e.g., {envVar.example}
                    </code>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                {envVar.default ? (
                  <code className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">
                    {envVar.default}
                  </code>
                ) : (
                  <span className="text-[var(--text-muted)]">-</span>
                )}
              </td>
              <td className="py-3 px-4 text-[var(--text-secondary)]">
                {envVar.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
