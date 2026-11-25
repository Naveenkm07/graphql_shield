import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  GitBranch,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { HardenedGuardResult, ShieldConfig } from '../engine/types';

interface PipelineStepperProps {
  hardened: HardenedGuardResult;
  config: ShieldConfig;
}

export function PipelineStepper({ hardened, config }: PipelineStepperProps) {
  const { stageMetrics, depth, complexity, allowed } = hardened;

  const stages = [
    {
      num: '1',
      title: 'Fragment Expansion',
      subtitle: 'Splice spreads in place before measurement',
      metric:
        stageMetrics.spreadsExpanded > 0
          ? `${stageMetrics.spreadsExpanded} spread${stageMetrics.spreadsExpanded === 1 ? '' : 's'} expanded`
          : '0 spreads needed',
      status: stageMetrics.circularFragments.length > 0 ? 'warn' : 'active',
      icon: GitBranch,
    },
    {
      num: '2',
      title: 'Per-Alias Scoring',
      subtitle: 'Each alias walked as its own subtree',
      metric: `${stageMetrics.rootNodesScored} root · ${stageMetrics.totalNodesScored} total nodes`,
      status: stageMetrics.rootNodesScored > 10 ? 'warn' : 'active',
      icon: Layers,
    },
    {
      num: '3',
      title: 'List-Arg Multiply',
      subtitle: `first/limit multiplies subtree (cap ${config.listFactorCap})`,
      metric:
        stageMetrics.maxMultiplier > 1
          ? `Peak ${stageMetrics.maxMultiplier.toLocaleString()}×${stageMetrics.listCappedNodes > 0 ? ` (${stageMetrics.listCappedNodes} capped)` : ''}`
          : 'No list amplification (1×)',
      status: stageMetrics.maxMultiplier > 50 ? 'warn' : 'active',
      icon: Calculator,
    },
    {
      num: '4',
      title: 'Budget Verification',
      subtitle: `Reject if depth > ${config.maxDepth} or cost > ${config.maxComplexity}`,
      metric: `Depth ${depth}/${config.maxDepth} · Cost ${complexity.toLocaleString()}/${config.maxComplexity.toLocaleString()}`,
      status: allowed ? 'pass' : 'block',
      icon: Zap,
    },
    {
      num: '5',
      title: 'Pre-Exec Gate',
      subtitle: allowed
        ? 'Cleared to reach GraphQL resolvers'
        : 'Blocked before any resolver runs',
      metric: allowed
        ? `ALLOWED (${hardened.durationMs.toFixed(2)} ms)`
        : `REJECTED · 0 ms resolver work`,
      status: allowed ? 'pass' : 'block',
      icon: allowed ? ShieldCheck : ShieldAlert,
    },
  ] as const;

  const statusClasses = {
    active:
      'border-cyan-500/30 bg-cyan-500/5 dark:border-cyan-500/30 dark:bg-cyan-500/10',
    warn: 'border-amber-500/40 bg-amber-500/8 dark:border-amber-500/40 dark:bg-amber-500/10',
    pass: 'border-emerald-500/40 bg-emerald-500/8 dark:border-emerald-500/40 dark:bg-emerald-500/10',
    block:
      'border-rose-500/45 bg-rose-500/10 dark:border-rose-500/50 dark:bg-rose-500/12',
  };

  const iconClasses = {
    active: 'text-cyan-600 dark:text-cyan-400',
    warn: 'text-amber-600 dark:text-amber-400',
    pass: 'text-emerald-600 dark:text-emerald-400',
    block: 'text-rose-600 dark:text-rose-400',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Five-Stage Hardened Shield Pipeline (Figure 7.1)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Static pre-execution defense stages executed on the current AST
          </p>
        </div>
        {stageMetrics.circularFragments.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
            Cycle guard triggered:{' '}
            {stageMetrics.circularFragments.join(', ')}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-5">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <div key={stage.num} className="relative flex items-stretch gap-2">
              <div
                className={`flex w-full flex-col justify-between rounded-lg border p-3 transition-colors ${statusClasses[stage.status]}`}
              >
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/10 text-[11px] font-bold text-slate-800 dark:bg-white/10 dark:text-slate-100">
                      {stage.num}
                    </span>
                    <Icon className={`h-4 w-4 ${iconClasses[stage.status]}`} />
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {stage.title}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-600 dark:text-slate-400">
                    {stage.subtitle}
                  </p>
                </div>
                <div className="mt-2.5 flex items-center gap-1 border-t border-slate-200/70 pt-2 font-mono text-[11px] font-semibold text-slate-800 dark:border-slate-700/60 dark:text-slate-200">
                  {stage.status === 'pass' && (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  )}
                  <span className="truncate" title={stage.metric}>
                    {stage.metric}
                  </span>
                </div>
              </div>
              {idx < stages.length - 1 && (
                <div className="hidden items-center text-slate-400 md:flex">
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
