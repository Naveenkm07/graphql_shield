import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Braces,
  Code2,
  Copy,
  Check,
  Cpu,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { SCENARIO_PRESETS, ScenarioPreset } from '../engine/fixtures';
import {
  formatShieldASTToGraphQL,
  parseGraphQLToShieldAST,
  parseJsonToShieldAST,
} from '../engine/graphqlParser';
import { analyzeDualGuards } from '../engine/shield';
import { FragmentMap, QueryAST, ShieldConfig } from '../engine/types';
import { AstTreeVisualizer } from './AstTreeVisualizer';
import { Badge } from './Badge';
import { PipelineStepper } from './PipelineStepper';

interface AttackLabViewProps {
  config: ShieldConfig;
  externalPayload?: {
    id: string;
    title: string;
    graphql: string;
  } | null;
  onClearExternalPayload?: () => void;
}

type EditorMode = 'graphql' | 'json';

export function AttackLabView({
  config,
  externalPayload,
  onClearExternalPayload,
}: AttackLabViewProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    SCENARIO_PRESETS[1].id
  );
  const [editorMode, setEditorMode] = useState<EditorMode>('graphql');
  const [graphqlText, setGraphqlText] = useState<string>(
    SCENARIO_PRESETS[1].graphql
  );
  const [jsonText, setJsonText] = useState<string>(() =>
    JSON.stringify(SCENARIO_PRESETS[1].ast, null, 2)
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (externalPayload) {
      setSelectedPresetId(`external-${externalPayload.id}`);
      setEditorMode('graphql');
      setGraphqlText(externalPayload.graphql);
      const parsed = parseGraphQLToShieldAST(externalPayload.graphql);
      if (parsed.ok) {
        setJsonText(
          JSON.stringify(
            { query: parsed.query, fragments: parsed.fragments },
            null,
            2
          )
        );
      }
      onClearExternalPayload?.();
    }
  }, [externalPayload, onClearExternalPayload]);

  const activePreset: ScenarioPreset | undefined = useMemo(
    () => SCENARIO_PRESETS.find((p) => p.id === selectedPresetId),
    [selectedPresetId]
  );

  const parsedOutcome = useMemo(() => {
    return editorMode === 'graphql'
      ? parseGraphQLToShieldAST(graphqlText)
      : parseJsonToShieldAST(jsonText);
  }, [editorMode, graphqlText, jsonText]);

  const analysis = useMemo(() => {
    if (!parsedOutcome.ok) return null;
    return analyzeDualGuards(
      parsedOutcome.query,
      parsedOutcome.fragments,
      config
    );
  }, [parsedOutcome, config]);

  const selectPreset = (preset: ScenarioPreset) => {
    setSelectedPresetId(preset.id);
    setGraphqlText(preset.graphql);
    setJsonText(JSON.stringify(preset.ast, null, 2));
  };

  const switchMode = (nextMode: EditorMode) => {
    if (nextMode === editorMode) return;
    if (nextMode === 'json' && parsedOutcome.ok) {
      setJsonText(
        JSON.stringify(
          {
            query: parsedOutcome.query,
            fragments: parsedOutcome.fragments,
          },
          null,
          2
        )
      );
    } else if (nextMode === 'graphql' && parsedOutcome.ok) {
      setGraphqlText(
        formatShieldASTToGraphQL(
          parsedOutcome.query,
          parsedOutcome.fragments,
          parsedOutcome.operationName || 'CustomQuery'
        )
      );
    }
    setEditorMode(nextMode);
  };

  const applyMutation = (
    mutator: (ast: { query: QueryAST; fragments: FragmentMap }) => {
      query: QueryAST;
      fragments: FragmentMap;
    }
  ) => {
    if (!parsedOutcome.ok) return;
    const updated = mutator({
      query: structuredClone(parsedOutcome.query),
      fragments: structuredClone(parsedOutcome.fragments),
    });
    const nextGraphql = formatShieldASTToGraphQL(
      updated.query,
      updated.fragments,
      parsedOutcome.operationName || 'MutatedQuery'
    );
    setGraphqlText(nextGraphql);
    setJsonText(JSON.stringify(updated, null, 2));
  };

  const injectAliases = () => {
    applyMutation((ast) => {
      const base = ast.query.selections[0] ?? {
        name: 'users',
        args: { first: 200 },
        selections: [{ name: 'id' }],
      };
      const startIndex = ast.query.selections.length;
      for (let i = 0; i < 50; i++) {
        ast.query.selections.push({
          ...structuredClone(base),
          alias: `amp_${startIndex + i}`,
          args: { ...(base.args ?? {}), first: base.args?.first ?? 200 },
        });
      }
      return ast;
    });
  };

  const wrapInHiddenFragment = () => {
    applyMutation((ast) => {
      const fragName = `HiddenFrag_${Object.keys(ast.fragments).length + 1}`;
      ast.fragments[fragName] = {
        name: fragName,
        typeCondition: 'Node',
        selections: [
          {
            name: 'nestedA',
            selections: [
              {
                name: 'nestedB',
                selections: [
                  {
                    name: 'nestedC',
                    selections: ast.query.selections,
                  },
                ],
              },
            ],
          },
        ],
      };
      ast.query = { selections: [{ fragmentSpread: fragName }] };
      return ast;
    });
  };

  const injectHighListArg = () => {
    applyMutation((ast) => {
      if (ast.query.selections[0]) {
        ast.query.selections[0].args = {
          ...(ast.query.selections[0].args ?? {}),
          first: 10000,
        };
      }
      return ast;
    });
  };

  const copyCurrentSource = async () => {
    try {
      await navigator.clipboard.writeText(
        editorMode === 'graphql' ? graphqlText : jsonText
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard may be unavailable in restricted contexts
    }
  };

  return (
    <div className="space-y-5">
      {/* Preset Scenario Selector Strip */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Adversarial & Benign Query Presets
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Load report attack vectors or write any custom GraphQL query to
              compare `naiveGuard` vs `hardenedGuard`
            </p>
          </div>
          {activePreset && (
            <Badge
              tone={activePreset.category === 'attack' ? 'rose' : 'emerald'}
            >
              {activePreset.flawTag}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {SCENARIO_PRESETS.map((preset) => {
            const isActive = preset.id === selectedPresetId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => selectPreset(preset)}
                className={`flex flex-col items-start justify-between rounded-lg border p-2.5 text-left transition-all ${
                  isActive
                    ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/40 dark:border-cyan-400 dark:bg-cyan-500/15'
                    : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-slate-700 dark:hover:bg-slate-800/70'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-1">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      preset.category === 'attack'
                        ? 'bg-rose-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <span className="font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    N:{preset.expectedNaive} / H:{preset.expectedHardened}
                  </span>
                </div>
                <div className="mt-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {preset.shortLabel}
                </div>
              </button>
            );
          })}
        </div>

        {activePreset && (
          <p className="mt-3 rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
            <strong className="text-slate-900 dark:text-slate-100">
              Scenario Brief:
            </strong>{' '}
            {activePreset.summary}
          </p>
        )}
      </div>

      {/* Main Split: Query Editor + Dual Verdict Panel */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Left: Interactive Query / JSON AST Editor */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-6 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => switchMode('graphql')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    editorMode === 'graphql'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  GraphQL Query
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('json')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    editorMode === 'json'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Braces className="h-3.5 w-3.5" />
                  Report AST JSON
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={copyCurrentSource}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => selectPreset(SCENARIO_PRESETS[0])}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Reset to benign baseline query"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
          </div>

          {/* Attack Mutation Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-slate-50/80 px-4 py-2 dark:border-slate-800 dark:bg-slate-950/60">
            <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <Sparkles className="h-3 w-3 text-cyan-500" />
              Quick Mutators:
            </span>
            <button
              type="button"
              onClick={injectAliases}
              disabled={!parsedOutcome.ok}
              className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:border-cyan-500 hover:text-cyan-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-cyan-500 dark:hover:text-cyan-300"
            >
              +50 Aliases
            </button>
            <button
              type="button"
              onClick={wrapInHiddenFragment}
              disabled={!parsedOutcome.ok}
              className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:border-cyan-500 hover:text-cyan-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-cyan-500 dark:hover:text-cyan-300"
            >
              Wrap +3 Levels in Fragment
            </button>
            <button
              type="button"
              onClick={injectHighListArg}
              disabled={!parsedOutcome.ok}
              className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:border-cyan-500 hover:text-cyan-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-cyan-500 dark:hover:text-cyan-300"
            >
              Set first: 10000
            </button>
          </div>

          <div className="relative flex-1 p-3">
            <textarea
              aria-label={
                editorMode === 'graphql'
                  ? 'GraphQL Query Editor'
                  : 'Report AST JSON Editor'
              }
              spellCheck={false}
              value={editorMode === 'graphql' ? graphqlText : jsonText}
              onChange={(e) => {
                if (editorMode === 'graphql') {
                  setGraphqlText(e.target.value);
                } else {
                  setJsonText(e.target.value);
                }
              }}
              className="h-80 w-full resize-y rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-800"
            />

            {!parsedOutcome.ok && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <span className="font-semibold">Parse Error: </span>
                  {parsedOutcome.error}
                  {parsedOutcome.line ? ` (line ${parsedOutcome.line}, col ${parsedOutcome.column})` : ''}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Dual-Guard Real-Time Verdict Comparison */}
        <div className="flex flex-col gap-4 xl:col-span-6">
          {analysis ? (
            <>
              {/* Bypass Detection Alert Banner */}
              {analysis.flawDetected.anyBypass ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/50 bg-amber-500/12 p-3.5 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/12 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                  <div className="text-xs leading-relaxed">
                    <div className="font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                      AI Baseline Bypass Detected!
                    </div>
                    <p className="mt-0.5">
                      <code>naiveGuard</code> waved this request through at
                      depth <strong>{analysis.naive.measuredDepth}</strong>,
                      while <code>hardenedGuard</code> rejected it statically
                      with <code className="font-bold">{analysis.hardened.reason}</code> —
                      preventing ~
                      <strong>
                        {analysis.impact.estimatedItemsFetched.toLocaleString()}
                      </strong>{' '}
                      items (~
                      <strong>{analysis.impact.hardenedSavedMs} ms</strong>) of
                      wasted resolver work.
                    </p>
                  </div>
                </div>
              ) : analysis.hardened.allowed ? (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-emerald-900 dark:text-emerald-200">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  <div className="text-xs leading-relaxed">
                    <div className="font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                      Query Cleared Within Security Budget
                    </div>
                    <p className="mt-0.5">
                      Both shields permit this query (depth{' '}
                      <strong>{analysis.hardened.depth}</strong>/{config.maxDepth}
                      , complexity{' '}
                      <strong>
                        {analysis.hardened.complexity.toLocaleString()}
                      </strong>
                      /{config.maxComplexity.toLocaleString()}).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-3.5 text-cyan-900 dark:text-cyan-200">
                  <Play className="mt-0.5 h-5 w-5 shrink-0 text-cyan-500" />
                  <div className="text-xs leading-relaxed">
                    <div className="font-bold uppercase tracking-wide text-cyan-800 dark:text-cyan-300">
                      Blocked by Both Guards
                    </div>
                    <p className="mt-0.5">
                      The raw query exceeds <code>MAX_DEPTH ({config.maxDepth})</code>{' '}
                      even without fragment expansion.
                    </p>
                  </div>
                </div>
              )}

              {/* Side-by-Side Comparison Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Naive Baseline Card */}
                <div
                  className={`rounded-xl border p-4 shadow-sm ${
                    analysis.naive.allowed && !analysis.hardened.allowed
                      ? 'border-amber-500/50 bg-white dark:border-amber-500/40 dark:bg-slate-900/70'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        AI Baseline
                      </span>
                      <h3 className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                        naiveGuard()
                      </h3>
                    </div>
                    <Badge
                      tone={
                        analysis.naive.allowed
                          ? analysis.hardened.allowed
                            ? 'emerald'
                            : 'amber'
                          : 'rose'
                      }
                    >
                      {analysis.naive.allowed
                        ? analysis.hardened.allowed
                          ? 'ALLOWED'
                          : 'BYPASSED'
                        : 'BLOCKED'}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Decision Reason</span>
                      <code className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {analysis.naive.reason}
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Measured Depth</span>
                      <span className="font-mono font-semibold">
                        {analysis.naive.measuredDepth} / {config.maxDepth}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Complexity Budget</span>
                      <span className="font-mono text-slate-400">
                        Unchecked (N/A)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Unexpanded Spreads</span>
                      <span className="font-mono text-amber-600 dark:text-amber-400">
                        {analysis.naive.unexpandedSpreads} ignored
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
                      <span className="text-slate-500">Resolver Work Paid</span>
                      <span
                        className={`font-mono font-semibold ${
                          analysis.naive.allowed && !analysis.hardened.allowed
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {analysis.impact.naiveWastedMs} ms
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hardened Shield Card */}
                <div
                  className={`rounded-xl border p-4 shadow-sm ${
                    analysis.hardened.allowed
                      ? 'border-emerald-500/40 bg-white dark:border-emerald-500/40 dark:bg-slate-900/70'
                      : 'border-rose-500/45 bg-white dark:border-rose-500/45 dark:bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                        Student-Engineered
                      </span>
                      <h3 className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                        hardenedGuard()
                      </h3>
                    </div>
                    <Badge tone={analysis.hardened.allowed ? 'emerald' : 'rose'}>
                      {analysis.hardened.allowed ? 'ALLOWED' : 'BLOCKED'}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="shrink-0 text-slate-500">
                        Decision Reason
                      </span>
                      <code className="truncate font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {analysis.hardened.reason}
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Expanded Depth</span>
                      <span
                        className={`font-mono font-semibold ${
                          analysis.hardened.depth > config.maxDepth
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {analysis.hardened.depth} / {config.maxDepth}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Complexity Score</span>
                      <span
                        className={`font-mono font-semibold ${
                          analysis.hardened.complexity > config.maxComplexity
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {analysis.hardened.complexity.toLocaleString()} /{' '}
                        {config.maxComplexity.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Static Check Time</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        {analysis.hardened.durationMs.toFixed(2)} ms
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
                      <span className="text-slate-500">Resolver CPU Saved</span>
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {analysis.hardened.allowed
                          ? 'Executed normally'
                          : `${analysis.impact.hardenedSavedMs} ms saved (0 ms spent)`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Meter Bars */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  <Cpu className="h-4 w-4 text-cyan-500" />
                  Static Complexity & Depth Utilization
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-slate-500">
                        Expanded Depth Budget
                      </span>
                      <span className="font-mono font-semibold">
                        {analysis.hardened.depth} / {config.maxDepth}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          analysis.hardened.depth > config.maxDepth
                            ? 'bg-rose-500'
                            : 'bg-cyan-500'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (analysis.hardened.depth / config.maxDepth) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-slate-500">
                        Complexity Budget
                      </span>
                      <span className="font-mono font-semibold">
                        {analysis.hardened.complexity.toLocaleString()} /{' '}
                        {config.maxComplexity.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          analysis.hardened.complexity > config.maxComplexity
                            ? 'bg-rose-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (analysis.hardened.complexity /
                              config.maxComplexity) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
              <div className="max-w-xs space-y-2">
                <ShieldAlert className="mx-auto h-8 w-8 text-rose-500" />
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  Fix the syntax error on the left to compute dual-guard cost
                  scoring.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5-Stage Pipeline & Interactive AST Tree */}
      {analysis && (
        <>
          <PipelineStepper hardened={analysis.hardened} config={config} />
          <AstTreeVisualizer
            tree={analysis.hardened.expandedTree}
            config={config}
            totalComplexity={analysis.hardened.complexity}
          />
        </>
      )}
    </div>
  );
}
