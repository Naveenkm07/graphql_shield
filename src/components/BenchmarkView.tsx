import { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Gauge,
  Play,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import {
  BenchmarkSummary,
  DEFAULT_LIVE_BENCHMARK_CONFIG,
  LiveBenchmarkConfig,
  TrafficCategory,
  getReportBaselineBenchmark,
  runLiveBenchmark,
} from '../engine/benchmark';
import { ShieldConfig } from '../engine/types';
import { Badge } from './Badge';

interface BenchmarkViewProps {
  config: ShieldConfig;
}

export function BenchmarkView({ config }: BenchmarkViewProps) {
  const [mode, setMode] = useState<'report-baseline' | 'live-simulation'>(
    'report-baseline'
  );
  const [simConfig, setSimConfig] = useState<LiveBenchmarkConfig>(
    DEFAULT_LIVE_BENCHMARK_CONFIG
  );
  const [simRunId, setSimRunId] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | TrafficCategory
  >('all');

  const summary: BenchmarkSummary = useMemo(() => {
    if (mode === 'report-baseline') {
      return getReportBaselineBenchmark();
    }
    void simRunId;
    return runLiveBenchmark(simConfig, config);
  }, [mode, simConfig, simRunId, config]);

  const filteredRequests = useMemo(() => {
    if (categoryFilter === 'all') return summary.requests;
    return summary.requests.filter((r) => r.category === categoryFilter);
  }, [summary.requests, categoryFilter]);

  // Log-scale helper for Figure 8.3 chart: domain [0.01 ms, 300 ms]
  const minLog = Math.log10(0.01);
  const maxLog = Math.log10(300);
  const valueToHeightPct = (ms: number) => {
    const clamped = Math.max(0.01, Math.min(300, ms));
    const ratio = (Math.log10(clamped) - minLog) / (maxLog - minLog);
    return Math.max(4, Math.min(100, ratio * 100));
  };

  return (
    <div className="space-y-5">
      {/* Mode Switcher & Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Comparative Benchmark (`benchmark.js`)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Inspect the report&apos;s 50-request benchmark (`benchmark-results.json`)
            or run a live customizable mixed-traffic simulation in your browser
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => setMode('report-baseline')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === 'report-baseline'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Report Baseline (50 Req)
            </button>
            <button
              type="button"
              onClick={() => setMode('live-simulation')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === 'live-simulation'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Live Browser Simulation
            </button>
          </div>

          {mode === 'live-simulation' && (
            <button
              type="button"
              onClick={() => setSimRunId((n) => n + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500"
            >
              <Play className="h-3.5 w-3.5" />
              Re-Run Benchmark
            </button>
          )}
        </div>
      </div>

      {/* Live Simulation Controls */}
      {mode === 'live-simulation' && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
            <SlidersHorizontal className="h-4 w-4 text-cyan-500" />
            Traffic Mix & Attack Parameters
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-xs">
              <span className="flex justify-between font-medium text-slate-600 dark:text-slate-300">
                Total Requests
                <strong className="font-mono">{simConfig.totalRequests}</strong>
              </span>
              <input
                type="range"
                min={20}
                max={150}
                step={10}
                value={simConfig.totalRequests}
                onChange={(e) =>
                  setSimConfig((s) => ({
                    ...s,
                    totalRequests: Number(e.target.value),
                  }))
                }
                className="mt-1.5 w-full accent-cyan-500"
              />
            </label>

            <label className="text-xs">
              <span className="flex justify-between font-medium text-slate-600 dark:text-slate-300">
                Benign Share
                <strong className="font-mono">{simConfig.benignShare}%</strong>
              </span>
              <input
                type="range"
                min={20}
                max={90}
                step={5}
                value={simConfig.benignShare}
                onChange={(e) =>
                  setSimConfig((s) => ({
                    ...s,
                    benignShare: Number(e.target.value),
                  }))
                }
                className="mt-1.5 w-full accent-emerald-500"
              />
            </label>

            <label className="text-xs">
              <span className="flex justify-between font-medium text-slate-600 dark:text-slate-300">
                Alias Attack Share
                <strong className="font-mono">{simConfig.aliasShare}%</strong>
              </span>
              <input
                type="range"
                min={0}
                max={50}
                step={5}
                value={simConfig.aliasShare}
                onChange={(e) =>
                  setSimConfig((s) => ({
                    ...s,
                    aliasShare: Number(e.target.value),
                  }))
                }
                className="mt-1.5 w-full accent-rose-500"
              />
            </label>

            <label className="text-xs">
              <span className="flex justify-between font-medium text-slate-600 dark:text-slate-300">
                Fragment Depth Share
                <strong className="font-mono">
                  {simConfig.fragmentShare}%
                </strong>
              </span>
              <input
                type="range"
                min={0}
                max={50}
                step={5}
                value={simConfig.fragmentShare}
                onChange={(e) =>
                  setSimConfig((s) => ({
                    ...s,
                    fragmentShare: Number(e.target.value),
                  }))
                }
                className="mt-1.5 w-full accent-amber-500"
              />
            </label>

            <label className="text-xs">
              <span className="flex justify-between font-medium text-slate-600 dark:text-slate-300">
                List-Arg Attack Share
                <strong className="font-mono">{simConfig.listShare}%</strong>
              </span>
              <input
                type="range"
                min={0}
                max={40}
                step={5}
                value={simConfig.listShare}
                onChange={(e) =>
                  setSimConfig((s) => ({
                    ...s,
                    listShare: Number(e.target.value),
                  }))
                }
                className="mt-1.5 w-full accent-indigo-500"
              />
            </label>
          </div>
        </div>
      )}

      {/* Figure 8.1 KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-cyan-500/30 bg-white p-4 shadow-sm dark:bg-slate-900/70">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Requests (Mixed Traffic)</span>
            <Activity className="h-4 w-4 text-cyan-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-white">
            {summary.totalRequests}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {summary.hardenedAllowed} benign · {summary.hardenedBlocked}{' '}
            adversarial
          </div>
        </div>

        <div className="rounded-xl border border-rose-500/35 bg-white p-4 shadow-sm dark:bg-slate-900/70">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Naive: Allowed</span>
            <Badge tone="rose">0 BLOCKED</Badge>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-rose-600 dark:text-rose-400">
            {summary.naiveAllowed}/{summary.totalRequests}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            All adversarial payloads bypassed depth-only guard
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/35 bg-white p-4 shadow-sm dark:bg-slate-900/70">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Hardened: Blocked</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {summary.hardenedBlocked}/{summary.totalRequests}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            100% malicious rejection before resolver execution
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/35 bg-white p-4 shadow-sm dark:bg-slate-900/70">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Wall-Clock (Naive → Hardened)</span>
            <Gauge className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 font-mono text-xl font-bold text-slate-900 dark:text-white">
            {summary.naiveTotalWallMs} ms →{' '}
            <span className="text-emerald-600 dark:text-emerald-400">
              {summary.hardenedTotalWallMs} ms
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            ~{summary.speedupRatio}× wall-clock latency reduction
          </div>
        </div>
      </div>

      {/* Figure 8.3 Visual Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: Log-scale latency per category */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-7 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <BarChart3 className="h-4 w-4 text-cyan-500" />
                Measured Cost per Request (Log Scale, ms)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Average time per request across traffic classes (Figure 8.3)
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-rose-600" />
                Naive (AI baseline)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-teal-600" />
                Hardened shield
              </span>
            </div>
          </div>

          <div className="mt-4 flex h-64 flex-col rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            {/* Shared 0%-100% Plot Space for Grid Lines & Bars */}
            <div className="relative mt-4 flex-1 pl-10">
              {[100, 10, 1, 0.1, 0.01].map((tick) => {
                const bottom = valueToHeightPct(tick);
                return (
                  <div
                    key={tick}
                    className="pointer-events-none absolute right-0 left-10 border-t border-dashed border-slate-300/70 dark:border-slate-800"
                    style={{ bottom: `${bottom}%` }}
                  >
                    <span className="absolute -top-2 -left-10 w-8 text-right font-mono text-[10px] text-slate-400">
                      {tick}
                    </span>
                  </div>
                );
              })}

              <div className="relative z-10 flex h-full items-end justify-around gap-4">
                {summary.categoryBreakdown.map((cat) => {
                  const naiveH = valueToHeightPct(cat.naiveAvgMs);
                  const hardenedH = valueToHeightPct(cat.hardenedAvgMs);
                  return (
                    <div
                      key={cat.category}
                      className="flex h-full flex-1 items-end justify-center gap-2.5"
                    >
                      <div className="relative h-full w-10">
                        <div
                          className="absolute right-0 bottom-0 left-0 rounded-t bg-rose-600 transition-all dark:bg-rose-500"
                          style={{ height: `${naiveH}%` }}
                        >
                          <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                            {cat.naiveAvgMs}
                          </span>
                        </div>
                      </div>
                      <div className="relative h-full w-10">
                        <div
                          className="absolute right-0 bottom-0 left-0 rounded-t bg-teal-600 transition-all dark:bg-teal-500"
                          style={{ height: `${hardenedH}%` }}
                        >
                          <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] font-semibold text-teal-600 dark:text-teal-400">
                            {cat.hardenedAvgMs}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-Axis Labels */}
            <div className="mt-2 flex justify-around gap-4 border-t border-slate-200 pt-2 pl-10 dark:border-slate-800">
              {summary.categoryBreakdown.map((cat) => (
                <div
                  key={cat.category}
                  className="flex-1 text-center text-[11px] font-medium text-slate-700 dark:text-slate-300"
                >
                  {cat.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Stacked Allowed vs Blocked chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-5 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Requests Allowed vs Blocked
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {summary.totalRequests}-request mixed traffic enforcement
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-cyan-700 dark:bg-cyan-500" />
                Allowed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-stone-400 dark:bg-slate-500" />
                Blocked
              </span>
            </div>
          </div>

          <div className="mt-4 flex h-64 items-end justify-around gap-8 rounded-lg border border-slate-200 bg-slate-50/70 px-6 pt-6 pb-4 dark:border-slate-800 dark:bg-slate-950/60">
            {[
              {
                name: 'Naive (AI baseline)',
                allowed: summary.naiveAllowed,
                blocked: summary.naiveBlocked,
              },
              {
                name: 'Hardened shield',
                allowed: summary.hardenedAllowed,
                blocked: summary.hardenedBlocked,
              },
            ].map((bar) => {
              const allowedPct = (bar.allowed / summary.totalRequests) * 100;
              const blockedPct = (bar.blocked / summary.totalRequests) * 100;
              return (
                <div
                  key={bar.name}
                  className="flex h-full flex-1 flex-col items-center justify-end"
                >
                  <div className="flex h-[84%] w-20 flex-col justify-end overflow-hidden rounded-t-md border border-slate-300/60 dark:border-slate-700">
                    {bar.blocked > 0 && (
                      <div
                        className="flex items-center justify-center bg-stone-400 font-mono text-xs font-bold text-slate-900 transition-all dark:bg-slate-500 dark:text-white"
                        style={{ height: `${blockedPct}%` }}
                      >
                        {bar.blocked}
                      </div>
                    )}
                    <div
                      className="flex items-center justify-center bg-cyan-700 font-mono text-xs font-bold text-white transition-all dark:bg-cyan-600"
                      style={{ height: `${allowedPct}%` }}
                    >
                      {bar.allowed}
                    </div>
                  </div>
                  <div className="mt-2.5 text-center text-xs font-medium text-slate-700 dark:text-slate-300">
                    {bar.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Request-by-Request Audit Log */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Request-Level Audit Log ({filteredRequests.length} rows)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Filter by traffic class to inspect Naive bypasses and Hardened
              pre-execution rejections
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['all', 'All'],
                ['benign', 'Benign'],
                ['alias-amplification', 'Alias Attack'],
                ['fragment-hidden-depth', 'Fragment Depth'],
                ['list-arg-explosion', 'List-Arg'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setCategoryFilter(val)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  categoryFilter === val
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-72 overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Traffic Class</th>
                <th className="px-3 py-2">Naive Verdict</th>
                <th className="px-3 py-2">Hardened Verdict</th>
                <th className="px-3 py-2">Depth (N→H)</th>
                <th className="px-3 py-2">Complexity</th>
                <th className="px-3 py-2 text-right">Naive ms</th>
                <th className="px-3 py-2 text-right">Hardened ms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredRequests.map((req) => (
                <tr
                  key={req.index}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="px-3 py-1.5 font-mono text-slate-500">
                    {req.index}
                  </td>
                  <td className="px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200">
                    {req.label}
                  </td>
                  <td className="px-3 py-1.5">
                    <Badge
                      tone={
                        req.naiveAllowed
                          ? req.hardenedAllowed
                            ? 'emerald'
                            : 'amber'
                          : 'rose'
                      }
                    >
                      {req.naiveAllowed
                        ? req.hardenedAllowed
                          ? 'ALLOW'
                          : 'BYPASS'
                        : 'BLOCK'}
                    </Badge>
                  </td>
                  <td className="px-3 py-1.5 font-mono">
                    <Badge tone={req.hardenedAllowed ? 'emerald' : 'rose'}>
                      {req.hardenedReason}
                    </Badge>
                  </td>
                  <td className="px-3 py-1.5 font-mono">
                    {req.naiveDepth} → {req.hardenedDepth}
                  </td>
                  <td className="px-3 py-1.5 font-mono">
                    {req.hardenedComplexity.toLocaleString()}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-rose-600 dark:text-rose-400">
                    {req.naiveMs}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                    {req.hardenedMs}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
