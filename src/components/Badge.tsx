import React from 'react';

export type BadgeTone =
  | 'emerald'
  | 'rose'
  | 'amber'
  | 'cyan'
  | 'indigo'
  | 'slate';

const TONE_CLASSES: Record<BadgeTone, string> = {
  emerald:
    'bg-emerald-500/12 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  rose: 'bg-rose-500/12 text-rose-700 border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
  amber:
    'bg-amber-500/12 text-amber-700 border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  cyan: 'bg-cyan-500/12 text-cyan-700 border-cyan-500/30 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30',
  indigo:
    'bg-indigo-500/12 text-indigo-700 border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30',
  slate:
    'bg-slate-500/10 text-slate-700 border-slate-400/30 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600/50',
};

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  tone = 'slate',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
