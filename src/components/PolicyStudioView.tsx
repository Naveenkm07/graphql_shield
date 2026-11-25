import { useMemo, useState } from 'react';
import {
  Plus,
  RotateCcw,
  Shield,
  Sliders,
  Trash2,
} from 'lucide-react';
import { runSecurityTestSuite } from '../engine/testHarness';
import { DEFAULT_SHIELD_CONFIG, ShieldConfig } from '../engine/types';
import { Badge } from './Badge';

interface PolicyStudioViewProps {
  config: ShieldConfig;
  onChange: (next: ShieldConfig) => void;
  onReset: () => void;
}

const SUGGESTED_FIELDS = ['users', 'posts', 'orders', 'comments', 'analytics'];

export function PolicyStudioView({
  config,
  onChange,
  onReset,
}: PolicyStudioViewProps) {
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldWeight, setNewFieldWeight] = useState(5);

  const liveTestImpact = useMemo(() => {
    const results = runSecurityTestSuite(config);
    const canonical = results.filter((r) => r.group === 'canonical');
    return {
      canonicalPassing: canonical.filter((r) => r.passed).length,
      canonicalTotal: canonical.length,
      totalPassing: results.filter((r) => r.passed).length,
      totalCount: results.length,
      canonical,
    };
  }, [config]);

  const isDefault =
    config.maxDepth === DEFAULT_SHIELD_CONFIG.maxDepth &&
    config.maxComplexity === DEFAULT_SHIELD_CONFIG.maxComplexity &&
    config.listFactorCap === DEFAULT_SHIELD_CONFIG.listFactorCap &&
    Object.keys(config.fieldWeights).length === 0;

  const upsertFieldWeight = (fieldName: string, weight: number) => {
    const clean = fieldName.trim();
    if (!clean) return;
    onChange({
      ...config,
      fieldWeights: {
        ...config.fieldWeights,
        [clean]: Math.max(1, Math.min(100, weight)),
      },
    });
  };

  const removeFieldWeight = (fieldName: string) => {
    const copy = { ...config.fieldWeights };
    delete copy[fieldName];
    onChange({
      ...config,
      fieldWeights: copy,
    });
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;
    upsertFieldWeight(newFieldName, newFieldWeight);
    setNewFieldName('');
    setNewFieldWeight(5);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Shield Policy & Schema Cost Studio
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tune depth ceilings, complexity budgets, list-factor caps, and
            per-field cost weights across the entire console
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={isDefault ? 'cyan' : 'amber'}>
            {isDefault ? 'Report Canonical Defaults' : 'Custom Policy Active'}
          </Badge>
          <button
            type="button"
            onClick={onReset}
            disabled={isDefault}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Report Defaults
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Threshold Controls */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-6 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Sliders className="h-4 w-4 text-cyan-500" />
            Core Budget Ceilings
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  MAX_DEPTH (Expanded AST Depth Ceiling)
                </span>
                <span className="font-mono text-sm font-bold text-cyan-600 dark:text-cyan-400">
                  {config.maxDepth}
                </span>
              </div>
              <input
                aria-label="MAX_DEPTH"
                type="range"
                min={2}
                max={15}
                step={1}
                value={config.maxDepth}
                onChange={(e) =>
                  onChange({ ...config, maxDepth: Number(e.target.value) })
                }
                className="mt-2 w-full accent-cyan-500"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Report default: <code>6</code>. Rejects queries whose expanded
                fragment depth exceeds this ceiling.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  MAX_COMPLEXITY (Numeric Cost Budget)
                </span>
                <span className="font-mono text-sm font-bold text-cyan-600 dark:text-cyan-400">
                  {config.maxComplexity.toLocaleString()}
                </span>
              </div>
              <input
                aria-label="MAX_COMPLEXITY"
                type="range"
                min={100}
                max={5000}
                step={50}
                value={config.maxComplexity}
                onChange={(e) =>
                  onChange({
                    ...config,
                    maxComplexity: Number(e.target.value),
                  })
                }
                className="mt-2 w-full accent-cyan-500"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Report default: <code>1000</code>. Stops breadth/alias
                amplification and nested list explosions before resolvers run.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  LIST_FACTOR_CAP (Per-Node Argument Cap)
                </span>
                <span className="font-mono text-sm font-bold text-cyan-600 dark:text-cyan-400">
                  {config.listFactorCap}
                </span>
              </div>
              <input
                aria-label="LIST_FACTOR_CAP"
                type="range"
                min={25}
                max={1000}
                step={25}
                value={config.listFactorCap}
                onChange={(e) =>
                  onChange({
                    ...config,
                    listFactorCap: Number(e.target.value),
                  })
                }
                className="mt-2 w-full accent-cyan-500"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Report default: <code>500</code>. Caps{' '}
                <code>Math.min(first || limit, cap)</code> per node while still
                multiplying nested descendants.
              </p>
            </div>
          </div>
        </div>

        {/* Custom Field Weights */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-6 dark:border-slate-800 dark:bg-slate-900/70">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Per-Field Resolver Weights
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Section 10 recommends calibrating weights against real resolver
              latency. Unlisted fields default to weight <code>1</code>.
            </p>
          </div>

          <form onSubmit={handleAddField} className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Field name (e.g. orders)"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              className="min-w-40 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <input
              type="number"
              min={1}
              max={100}
              value={newFieldWeight}
              onChange={(e) => setNewFieldWeight(Number(e.target.value))}
              className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500"
            >
              <Plus className="h-3.5 w-3.5" />
              Set Weight
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-500">Quick add:</span>
            {SUGGESTED_FIELDS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => upsertFieldWeight(f, 5)}
                className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-700 hover:border-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                +{f}(5)
              </button>
            ))}
          </div>

          <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
            {Object.keys(config.fieldWeights).length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                All fields currently use the uniform baseline weight{' '}
                <code>1</code> (matching Section 8.1).
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-[11px] text-slate-600 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Field</th>
                    <th className="px-3 py-2">Weight</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {Object.entries(config.fieldWeights).map(
                    ([field, weight]) => (
                      <tr key={field}>
                        <td className="px-3 py-1.5 font-mono font-semibold">
                          {field}
                        </td>
                        <td className="px-3 py-1.5 font-mono">{weight}×</td>
                        <td className="px-3 py-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => removeFieldWeight(field)}
                            className="inline-flex items-center gap-1 rounded p-1 text-rose-500 hover:bg-rose-500/10"
                            aria-label={`Remove ${field} weight`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Live Policy Regression Preview */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-cyan-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Live Policy Regression Impact
            </h3>
          </div>
          <Badge
            tone={
              liveTestImpact.canonicalPassing === liveTestImpact.canonicalTotal
                ? 'emerald'
                : 'rose'
            }
          >
            Canonical Suite: {liveTestImpact.canonicalPassing}/
            {liveTestImpact.canonicalTotal} · Extended:{' '}
            {liveTestImpact.totalPassing}/{liveTestImpact.totalCount}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {liveTestImpact.canonical.map((t) => (
            <div
              key={t.id}
              className={`rounded-lg border p-2.5 text-xs ${
                t.passed
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-rose-500/40 bg-rose-500/10'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                  {t.name}
                </span>
                <Badge tone={t.passed ? 'emerald' : 'rose'}>
                  {t.passed ? 'PASS' : 'FAIL'}
                </Badge>
              </div>
              <div className="mt-1 font-mono text-[11px] text-slate-500">
                {t.actualSummary}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
