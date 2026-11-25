import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Play,
  Terminal,
  XCircle,
} from 'lucide-react';
import {
  SecurityTestCaseResult,
  runSecurityTestSuite,
} from '../engine/testHarness';
import { ShieldConfig } from '../engine/types';
import { Badge } from './Badge';

interface TestHarnessViewProps {
  config: ShieldConfig;
  onLoadQueryInLab: (payload: {
    id: string;
    title: string;
    graphql: string;
  }) => void;
}

export function TestHarnessView({
  config,
  onLoadQueryInLab,
}: TestHarnessViewProps) {
  const [runCounter, setRunCounter] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>('canon-4');

  const results = useMemo(() => {
    void runCounter;
    return runSecurityTestSuite(config);
  }, [config, runCounter]);

  const canonical = results.filter((r) => r.group === 'canonical');
  const extended = results.filter((r) => r.group === 'extended');
  const canonicalPassed = canonical.filter((r) => r.passed).length;
  const totalPassed = results.filter((r) => r.passed).length;

  const renderGroup = (
    title: string,
    subtitle: string,
    items: SecurityTestCaseResult[]
  ) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>
        <Badge
          tone={
            items.every((i) => i.passed) ? 'emerald' : 'rose'
          }
        >
          {items.filter((i) => i.passed).length}/{items.length} passing
        </Badge>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const isOpen = expandedId === item.id;
          return (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/60"
            >
              <div
                onClick={() => setExpandedId(isOpen ? null : item.id)}
                className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                  {item.passed ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  )}
                  <Badge tone={item.passed ? 'emerald' : 'rose'}>
                    {item.passed ? 'PASS' : 'FAIL'}
                  </Badge>
                  <span className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">
                    {item.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Badge tone="slate" className="font-mono">
                    {item.guardUsed}
                  </Badge>
                  <span className="font-mono text-[11px] text-slate-500">
                    {item.durationMs} ms
                  </span>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-slate-200 px-4 py-3 text-xs dark:border-slate-800">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Assertion Code
                      </div>
                      <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] text-slate-200">
                        {item.assertionCode}
                      </pre>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Expected:
                        </span>
                        <div className="font-mono text-slate-800 dark:text-slate-200">
                          {item.expectedSummary}
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Observed:
                        </span>
                        <div className="font-mono text-emerald-700 dark:text-emerald-300">
                          {item.actualSummary}
                        </div>
                      </div>
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            onLoadQueryInLab({
                              id: item.id,
                              title: item.name,
                              graphql: item.graphql,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-500/20 dark:text-cyan-300"
                        >
                          Inspect Payload in Attack Lab
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header & Run Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Automated Security Test Harness (`testHarness.js`)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Live in-browser verification of report Figure 8.2 assertions plus
            extended edge cases under your active policy thresholds
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge tone={totalPassed === results.length ? 'emerald' : 'amber'}>
            Total: {totalPassed}/{results.length} passing
          </Badge>
          <button
            type="button"
            onClick={() => setRunCounter((c) => c + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-cyan-500"
          >
            <Play className="h-3.5 w-3.5" />
            Re-Run Security Suite
          </button>
        </div>
      </div>

      {/* Terminal Execution Output matching Figure 8.2 */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0d1117] shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#161b22] px-4 py-2">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
            <Terminal className="h-3.5 w-3.5 text-emerald-400" />
            <span>$ node testHarness.js (in-browser live run)</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            {canonicalPassed}/{canonical.length} canonical assertions passing
          </span>
        </div>
        <div className="space-y-1.5 p-4 font-mono text-xs">
          {canonical.map((r) => (
            <div key={r.id} className="flex items-start gap-4">
              <span
                className={`w-12 shrink-0 font-bold ${
                  r.passed ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {r.passed ? 'PASS' : 'FAIL'}
              </span>
              <span className="text-slate-200">{r.name}</span>
            </div>
          ))}
          <div className="mt-3 border-t border-slate-800 pt-2.5 text-slate-400">
            {canonicalPassed}/{canonical.length} tests passing
          </div>
        </div>
      </div>

      {/* Canonical & Extended Test Cards */}
      {renderGroup(
        'Canonical Report Suite (Section 8.2 / Figure 8.2)',
        'Proves both naive bypasses (Flaws A & B) and both hardened defenses on identical query ASTs.',
        canonical
      )}

      {renderGroup(
        'Extended Adversarial & Edge-Case Suite',
        'Validates list-argument capping (500/node), combined storms, benign pagination, and cycle termination.',
        extended
      )}
    </div>
  );
}
