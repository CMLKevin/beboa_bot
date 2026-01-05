'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Container for diagrams
interface DiagramProps {
  children: ReactNode;
  height?: number;
  className?: string;
}

export function Diagram({ children, height = 400, className }: DiagramProps) {
  return (
    <div
      className={cn(
        'my-8 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden',
        className
      )}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 800 ${height}`}
        className="w-full"
      >
        <defs>
          {/* Arrow marker */}
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              className="fill-[var(--text-muted)]"
            />
          </marker>
          <marker
            id="arrowhead-accent"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              className="fill-[var(--accent)]"
            />
          </marker>
        </defs>
        {children}
      </svg>
    </div>
  );
}

// Box component for services/components
interface DiagramBoxProps {
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  sublabel?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'accent';
}

export function DiagramBox({
  x,
  y,
  width = 160,
  height = 60,
  label,
  sublabel,
  variant = 'default',
}: DiagramBoxProps) {
  const variantStyles = {
    default: {
      fill: 'var(--bg-primary)',
      stroke: 'var(--border)',
      text: 'var(--text-primary)',
    },
    primary: {
      fill: 'var(--bg-secondary)',
      stroke: 'var(--text-muted)',
      text: 'var(--text-primary)',
    },
    secondary: {
      fill: 'var(--bg-tertiary)',
      stroke: 'var(--border)',
      text: 'var(--text-secondary)',
    },
    accent: {
      fill: 'var(--accent-light)',
      stroke: 'var(--accent)',
      text: 'var(--accent)',
    },
  };

  const style = variantStyles[variant];

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={1.5}
      />
      <text
        x={x + width / 2}
        y={y + (sublabel ? height / 2 - 6 : height / 2)}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-sm font-medium"
        fill={style.text}
      >
        {label}
      </text>
      {sublabel && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs"
          fill="var(--text-muted)"
        >
          {sublabel}
        </text>
      )}
    </g>
  );
}

// Arrow component for connections
interface DiagramArrowProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  label?: string;
  variant?: 'default' | 'accent';
  curved?: boolean;
}

export function DiagramArrow({
  from,
  to,
  label,
  variant = 'default',
  curved = false,
}: DiagramArrowProps) {
  const markerId = variant === 'accent' ? 'arrowhead-accent' : 'arrowhead';
  const strokeColor = variant === 'accent' ? 'var(--accent)' : 'var(--text-muted)';

  // Calculate path
  let d: string;
  if (curved) {
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const curvature = 30;
    d = `M ${from.x} ${from.y} Q ${midX} ${midY - curvature} ${to.x} ${to.y}`;
  } else {
    d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }

  const labelX = (from.x + to.x) / 2;
  const labelY = (from.y + to.y) / 2 - 8;

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        markerEnd={`url(#${markerId})`}
      />
      {label && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          className="text-xs"
          fill="var(--text-muted)"
        >
          {label}
        </text>
      )}
    </g>
  );
}

// Group container with label
interface DiagramGroupProps {
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;
  children: ReactNode;
}

export function DiagramGroup({
  x,
  y,
  width,
  height,
  title,
  children,
}: DiagramGroupProps) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={12}
        fill="var(--bg-secondary)"
        stroke="var(--border)"
        strokeWidth={1}
        strokeDasharray="4 2"
        opacity={0.5}
      />
      {title && (
        <text
          x={x + 12}
          y={y + 20}
          className="text-xs font-medium uppercase tracking-wide"
          fill="var(--text-muted)"
        >
          {title}
        </text>
      )}
      {children}
    </g>
  );
}

// Simple text label
interface DiagramLabelProps {
  x: number;
  y: number;
  children: string;
  variant?: 'default' | 'muted' | 'accent';
  size?: 'sm' | 'md' | 'lg';
}

export function DiagramLabel({
  x,
  y,
  children,
  variant = 'default',
  size = 'md',
}: DiagramLabelProps) {
  const colorMap = {
    default: 'var(--text-primary)',
    muted: 'var(--text-muted)',
    accent: 'var(--accent)',
  };

  const sizeMap = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      className={cn('font-medium', sizeMap[size])}
      fill={colorMap[variant]}
    >
      {children}
    </text>
  );
}
