import {
  DEFAULT_SHIELD_CONFIG,
  DualAnalysisResult,
  FragmentMap,
  HardenedGuardResult,
  HardenedStageMetrics,
  NaiveGuardResult,
  QueryAST,
  ScoredTreeNode,
  SelectionNode,
  ShieldConfig,
  SimulatedWorkloadImpact,
} from './types';

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/**
 * Exact AI-generated baseline walker (Section 5 of AAT-2 report).
 * Deliberately does NOT expand fragment spreads and ignores list arguments.
 */
export function naiveDepthOf(
  selections: SelectionNode[],
  _fragments: FragmentMap,
  depth = 1,
  telemetry?: { unexpandedSpreads: number }
): number {
  let max = depth;
  for (const sel of selections) {
    if (sel.fragmentSpread) {
      if (telemetry) {
        telemetry.unexpandedSpreads += 1;
      }
      // Treats a fragment spread as a single leaf node; never opens it.
      max = Math.max(max, depth + 1);
      continue;
    }
    if (sel.selections && sel.selections.length > 0) {
      max = Math.max(
        max,
        naiveDepthOf(sel.selections, _fragments, depth + 1, telemetry)
      );
    }
  }
  return max;
}

export function naiveGuard(
  query: QueryAST,
  fragments: FragmentMap = {},
  config: ShieldConfig = DEFAULT_SHIELD_CONFIG
): NaiveGuardResult {
  const start = nowMs();
  const telemetry = { unexpandedSpreads: 0 };
  const measuredDepth = naiveDepthOf(query.selections, fragments, 1, telemetry);
  const durationMs = Math.max(0.01, nowMs() - start);

  if (measuredDepth > config.maxDepth) {
    return {
      allowed: false,
      reason: `DEPTH_EXCEEDED(${measuredDepth})`,
      measuredDepth,
      durationMs,
      unexpandedSpreads: telemetry.unexpandedSpreads,
      visibleRootCount: query.selections.length,
    };
  }

  return {
    allowed: true,
    reason: 'OK',
    measuredDepth,
    durationMs,
    unexpandedSpreads: telemetry.unexpandedSpreads,
    visibleRootCount: query.selections.length,
  };
}

interface ExpandedSelection extends SelectionNode {
  expandedFromFragment?: string;
  selections?: ExpandedSelection[];
}

interface ExpandContext {
  spreadsExpanded: number;
  circularFragments: Set<string>;
}

/**
 * Stage 1: Fragment Expansion (fixes Flaw 2).
 * Splices every fragment spread in place before depth or complexity is scored.
 * Includes cycle detection so malformed recursive fragments cannot overflow the UI stack.
 */
export function expandSelections(
  selections: SelectionNode[],
  fragments: FragmentMap,
  ctx: ExpandContext = { spreadsExpanded: 0, circularFragments: new Set() },
  activeFragments: Set<string> = new Set(),
  originFragment?: string
): ExpandedSelection[] {
  const out: ExpandedSelection[] = [];
  for (const sel of selections) {
    if (sel.fragmentSpread) {
      const spreadName = sel.fragmentSpread;
      const frag = fragments[spreadName];
      if (!frag) continue;
      if (activeFragments.has(spreadName)) {
        ctx.circularFragments.add(spreadName);
        continue;
      }
      ctx.spreadsExpanded += 1;
      const nextActive = new Set(activeFragments);
      nextActive.add(spreadName);
      out.push(
        ...expandSelections(
          frag.selections,
          fragments,
          ctx,
          nextActive,
          spreadName
        )
      );
    } else {
      out.push({
        ...sel,
        expandedFromFragment: originFragment,
        selections: sel.selections
          ? expandSelections(
              sel.selections,
              fragments,
              ctx,
              activeFragments,
              originFragment
            )
          : [],
      });
    }
  }
  return out;
}

interface ScoreContext {
  nodeCounter: number;
  maxMultiplier: number;
  listCappedNodes: number;
}

/**
 * Stages 2 & 3: Per-node scoring and multiplicative list-argument propagation.
 */
function scoreExpandedNode(
  sel: ExpandedSelection,
  depth: number,
  multiplier: number,
  config: ShieldConfig,
  scoreCtx: ScoreContext
): ScoredTreeNode {
  scoreCtx.nodeCounter += 1;
  const fieldName = sel.name || sel.inlineFragmentType || 'anonymous';
  const configuredWeight = sel.name ? config.fieldWeights[sel.name] : undefined;
  const weight =
    typeof sel.weight === 'number' && sel.weight > 0
      ? sel.weight
      : typeof configuredWeight === 'number' && configuredWeight > 0
        ? configuredWeight
        : 1;

  const rawFirst =
    typeof sel.args?.first === 'number' ? sel.args.first : undefined;
  const rawLimit =
    typeof sel.args?.limit === 'number' ? sel.args.limit : undefined;
  const rawListArg = rawFirst || rawLimit;

  const hasPositiveListArg =
    typeof rawListArg === 'number' && Number.isFinite(rawListArg) && rawListArg > 0;
  const listFactor = hasPositiveListArg
    ? Math.min(rawListArg, config.listFactorCap)
    : 1;
  const listArgCapped =
    hasPositiveListArg && rawListArg > config.listFactorCap;

  if (listArgCapped) {
    scoreCtx.listCappedNodes += 1;
  }

  scoreCtx.maxMultiplier = Math.max(scoreCtx.maxMultiplier, multiplier);

  const ownCost = weight * multiplier;
  let subtreeMaxDepth = depth;
  let subtreeComplexity = ownCost;
  const scoredChildren: ScoredTreeNode[] = [];

  for (const child of sel.selections || []) {
    const childResult = scoreExpandedNode(
      child,
      depth + 1,
      multiplier * listFactor,
      config,
      scoreCtx
    );
    subtreeMaxDepth = Math.max(subtreeMaxDepth, childResult.subtreeMaxDepth);
    subtreeComplexity += childResult.subtreeComplexity;
    scoredChildren.push(childResult);
  }

  return {
    id: `node-${scoreCtx.nodeCounter}`,
    field: fieldName,
    alias: sel.alias,
    weight,
    rawListArg: hasPositiveListArg ? rawListArg : undefined,
    listFactor,
    listArgCapped,
    multiplier,
    ownCost,
    subtreeComplexity,
    depth,
    subtreeMaxDepth,
    expandedFromFragment: sel.expandedFromFragment,
    inlineFragmentType: sel.inlineFragmentType,
    children: scoredChildren,
  };
}

/**
 * Student-Engineered 5-Stage Hardened Shield (Section 8.1 of AAT-2 report).
 */
export function hardenedGuard(
  query: QueryAST,
  fragments: FragmentMap = {},
  config: ShieldConfig = DEFAULT_SHIELD_CONFIG
): HardenedGuardResult {
  const start = nowMs();
  const expandCtx: ExpandContext = {
    spreadsExpanded: 0,
    circularFragments: new Set(),
  };
  const expanded = expandSelections(query.selections, fragments, expandCtx);

  const scoreCtx: ScoreContext = {
    nodeCounter: 0,
    maxMultiplier: 1,
    listCappedNodes: 0,
  };

  let depth = 1;
  let complexity = 0;
  const expandedTree: ScoredTreeNode[] = [];

  for (const sel of expanded) {
    const scored = scoreExpandedNode(sel, 1, 1, config, scoreCtx);
    depth = Math.max(depth, scored.subtreeMaxDepth);
    complexity += scored.subtreeComplexity;
    expandedTree.push(scored);
  }

  const durationMs = Math.max(0.01, nowMs() - start);
  const stageMetrics: HardenedStageMetrics = {
    spreadsExpanded: expandCtx.spreadsExpanded,
    rootNodesScored: expanded.length,
    totalNodesScored: scoreCtx.nodeCounter,
    maxMultiplier: scoreCtx.maxMultiplier,
    listCappedNodes: scoreCtx.listCappedNodes,
    blockedStage: 'NONE',
    circularFragments: Array.from(expandCtx.circularFragments),
  };

  if (depth > config.maxDepth) {
    stageMetrics.blockedStage = 'DEPTH_BUDGET';
    return {
      allowed: false,
      reason: `DEPTH_EXCEEDED(${depth})`,
      depth,
      complexity,
      durationMs,
      stageMetrics,
      expandedTree,
    };
  }

  if (complexity > config.maxComplexity) {
    stageMetrics.blockedStage = 'COMPLEXITY_BUDGET';
    return {
      allowed: false,
      reason: `COMPLEXITY_EXCEEDED(${complexity})`,
      depth,
      complexity,
      durationMs,
      stageMetrics,
      expandedTree,
    };
  }

  return {
    allowed: true,
    reason: 'OK',
    depth,
    complexity,
    durationMs,
    stageMetrics,
    expandedTree,
  };
}

function countEstimatedItems(nodes: ScoredTreeNode[]): number {
  let total = 0;
  for (const node of nodes) {
    if (node.rawListArg && node.rawListArg > 1) {
      total += node.multiplier * node.rawListArg;
    } else if (node.children.length === 0) {
      total += node.multiplier;
    }
    total += countEstimatedItems(node.children);
  }
  return total;
}

export function estimateWorkloadImpact(
  naive: NaiveGuardResult,
  hardened: HardenedGuardResult,
  msPerThousandItems = 2.14
): SimulatedWorkloadImpact {
  const estimatedItemsFetched = Math.max(1, countEstimatedItems(hardened.expandedTree));
  const depthPenaltyMs = hardened.depth > 6 ? (hardened.depth - 6) * 6.5 : 0;
  const estimatedResolverMs = Number(
    (0.18 + (estimatedItemsFetched / 1000) * msPerThousandItems + depthPenaltyMs).toFixed(2)
  );

  const naiveWastedMs = naive.allowed
    ? Number((naive.durationMs + estimatedResolverMs).toFixed(2))
    : Number(naive.durationMs.toFixed(2));

  const hardenedSavedMs = !hardened.allowed
    ? Number(Math.max(0, estimatedResolverMs - hardened.durationMs).toFixed(2))
    : 0;

  return {
    estimatedItemsFetched,
    estimatedResolverMs,
    naiveWastedMs,
    hardenedSavedMs,
  };
}

export function analyzeDualGuards(
  query: QueryAST,
  fragments: FragmentMap = {},
  config: ShieldConfig = DEFAULT_SHIELD_CONFIG
): DualAnalysisResult {
  const naive = naiveGuard(query, fragments, config);
  const hardened = hardenedGuard(query, fragments, config);
  const impact = estimateWorkloadImpact(naive, hardened);

  const aliasAmplificationBypass =
    naive.allowed &&
    !hardened.allowed &&
    hardened.stageMetrics.blockedStage === 'COMPLEXITY_BUDGET' &&
    hardened.stageMetrics.rootNodesScored > 5;

  const fragmentHiddenDepthBypass =
    naive.allowed &&
    !hardened.allowed &&
    hardened.stageMetrics.spreadsExpanded > 0 &&
    hardened.depth > naive.measuredDepth;

  const listArgBypass =
    naive.allowed &&
    !hardened.allowed &&
    hardened.stageMetrics.maxMultiplier > 1;

  return {
    naive,
    hardened,
    impact,
    flawDetected: {
      aliasAmplificationBypass,
      fragmentHiddenDepthBypass,
      listArgBypass,
      anyBypass: naive.allowed && !hardened.allowed,
    },
  };
}
