import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { ScoredTreeNode, ShieldConfig } from '../engine/types';
import { Badge } from './Badge';

interface AstTreeVisualizerProps {
  tree: ScoredTreeNode[];
  config: ShieldConfig;
  totalComplexity: number;
}

const MAX_RENDERED_ROOTS = 40;

interface TreeRowProps {
  node: ScoredTreeNode;
  selectedId: string | null;
  onSelect: (node: ScoredTreeNode) => void;
  maxDepthLimit: number;
}

function TreeRow({
  node,
  selectedId,
  onSelect,
  maxDepthLimit,
}: TreeRowProps) {
  const [expanded, setExpanded] = useState(node.depth <= 4);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;
  const overDepth = node.depth > maxDepthLimit;

  return (
    <div className="select-none">
      <div
        onClick={() => onSelect(node)}
        className={`group flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
          isSelected
            ? 'border-cyan-500/60 bg-cyan-500/10 dark:border-cyan-400/50 dark:bg-cyan-500/15'
            : 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-800/50'
        }`}
        style={{ marginLeft: `${(node.depth - 1) * 16}px` }}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              aria-label={expanded ? 'Collapse node' : 'Expand node'}
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            <span className="inline-block w-4 text-center text-slate-400">
              ·
            </span>
          )}

          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
            {node.alias ? (
              <>
                <span className="text-amber-600 dark:text-amber-400">
                  {node.alias}:
                </span>{' '}
                {node.field}
              </>
            ) : (
              node.field
            )}
          </span>

          {node.expandedFromFragment && (
            <Badge tone="indigo" className="font-mono">
              ...{node.expandedFromFragment}
            </Badge>
          )}

          {node.rawListArg !== undefined && (
            <Badge tone={node.listArgCapped ? 'amber' : 'cyan'} className="font-mono">
              list:{node.rawListArg}
              {node.listArgCapped ? `→cap ${node.listFactor}` : ''}
            </Badge>
          )}

          {overDepth && (
            <Badge tone="rose" className="font-mono">
              depth {node.depth} &gt; {maxDepthLimit}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
          <span title="Tree depth">d:{node.depth}</span>
          <span title="Weight × Multiplier">
            {node.weight}×{node.multiplier.toLocaleString()}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 font-semibold ${
              node.subtreeComplexity >= 500
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
            }`}
            title="Subtree complexity"
          >
            cost {node.subtreeComplexity.toLocaleString()}
          </span>
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              maxDepthLimit={maxDepthLimit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AstTreeVisualizer({
  tree,
  config,
  totalComplexity,
}: AstTreeVisualizerProps) {
  const [selectedNode, setSelectedNode] = useState<ScoredTreeNode | null>(null);
  const [showAllRoots, setShowAllRoots] = useState(false);

  const visibleRoots = useMemo(() => {
    if (showAllRoots || tree.length <= MAX_RENDERED_ROOTS) return tree;
    return tree.slice(0, MAX_RENDERED_ROOTS);
  }, [tree, showAllRoots]);

  const activeNode = selectedNode ?? tree[0] ?? null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Expanded AST & Cost Attribution Tree
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Post-fragment-expansion selection tree scored by `hardenedGuard`
            (total cost: {totalComplexity.toLocaleString()})
          </p>
        </div>

        {tree.length > MAX_RENDERED_ROOTS && (
          <button
            type="button"
            onClick={() => setShowAllRoots((v) => !v)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {showAllRoots
              ? `Collapse to first ${MAX_RENDERED_ROOTS} aliases`
              : `Show all ${tree.length} root nodes`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 lg:col-span-2 dark:border-slate-800 dark:bg-slate-950/60">
          {visibleRoots.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No selection nodes parsed yet.
            </div>
          ) : (
            <div className="space-y-0.5">
              {visibleRoots.map((root) => (
                <TreeRow
                  key={root.id}
                  node={root}
                  selectedId={activeNode?.id ?? null}
                  onSelect={setSelectedNode}
                  maxDepthLimit={config.maxDepth}
                />
              ))}
              {!showAllRoots && tree.length > MAX_RENDERED_ROOTS && (
                <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-800 dark:text-amber-300">
                  Showing {MAX_RENDERED_ROOTS} of {tree.length} root alias
                  subtrees for responsive rendering (all {tree.length} were
                  scored by the engine).
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/80">
          {activeNode ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  <Info className="h-3.5 w-3.5 text-cyan-500" />
                  Node Cost Breakdown
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  depth {activeNode.depth}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    Field / Alias
                  </span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {activeNode.alias
                      ? `${activeNode.alias}: ${activeNode.field}`
                      : activeNode.field}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    Origin
                  </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {activeNode.expandedFromFragment
                      ? `fragment ...${activeNode.expandedFromFragment}`
                      : 'Direct query selection'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    Node Weight
                  </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {activeNode.weight}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    Incoming Multiplier
                  </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {activeNode.multiplier.toLocaleString()}×
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    Child List Factor
                  </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {activeNode.listFactor.toLocaleString()}×
                    {activeNode.listArgCapped
                      ? ` (capped from ${activeNode.rawListArg?.toLocaleString()})`
                      : ''}
                  </span>
                </div>
              </div>

              <div className="rounded-md border border-cyan-500/25 bg-cyan-500/5 p-2.5 font-mono text-[11px] dark:bg-cyan-500/10">
                <div className="text-slate-500 dark:text-slate-400">
                  ownCost = weight × multiplier
                </div>
                <div className="mt-0.5 font-semibold text-cyan-700 dark:text-cyan-300">
                  {activeNode.ownCost.toLocaleString()} = {activeNode.weight} ×{' '}
                  {activeNode.multiplier.toLocaleString()}
                </div>
                <div className="mt-1.5 border-t border-cyan-500/20 pt-1.5 text-slate-700 dark:text-slate-200">
                  subtreeComplexity:{' '}
                  <strong>
                    {activeNode.subtreeComplexity.toLocaleString()}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Select a node in the AST tree to inspect its cost equation.
            </p>
          )}
          <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            Click any row in the tree to inspect its multiplicative cost path.
          </div>
        </div>
      </div>
    </div>
  );
}
