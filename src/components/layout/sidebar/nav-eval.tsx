'use client';

import { SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from '@/components/ui/sidebar';
import { EVAL_SCORES, EVAL_META } from '@/mock-data/eval';
import { cn } from '@/lib/utils';

const COLOR_CLASS: Record<string, string> = {
  green: 'bg-emerald-500 dark:bg-emerald-400',
  amber: 'bg-amber-500 dark:bg-amber-400',
  red:   'bg-red-500 dark:bg-red-400',
};

const TEXT_CLASS: Record<string, string> = {
  green: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  red:   'text-red-600 dark:text-red-400',
};

export function NavEval() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Eval</SidebarGroupLabel>
      <SidebarGroupContent className="px-2 pb-1">
        <div className="flex flex-col gap-2">
          {EVAL_SCORES.map((score) => (
            <div key={score.label} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-11 shrink-0">{score.label}</span>
              <div className="flex-1 h-[3px] rounded-full bg-border overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', COLOR_CLASS[score.color])}
                  style={{ width: `${score.pct}%` }}
                />
              </div>
              <span className={cn('text-[10px] font-mono font-medium w-7 text-right shrink-0', TEXT_CLASS[score.color])}>
                {score.pct}%
              </span>
            </div>
          ))}
          <p className="text-[10.5px] text-muted-foreground mt-1">{EVAL_META}</p>
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
