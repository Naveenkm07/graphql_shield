export interface SelectionArgs {
  first?: number;
  limit?: number;
  [key: string]: unknown;
}

export interface SelectionNode {
  name?: string;
  alias?: string;
  weight?: number;
  args?: SelectionArgs;
  fragmentSpread?: string;
  inlineFragmentType?: string;
  selections?: SelectionNode[];
}

export interface FragmentDefinitionNode {
  name: string;
  typeCondition?: string;
  selections: SelectionNode[];
}

export type FragmentMap = Record<string, FragmentDefinitionNode>;

export interface QueryAST {
  selections: SelectionNode[];
}

export interface ShieldConfig {
  maxDepth: number;
  maxComplexity: number;
  listFactorCap: number;
  fieldWeights: Record<string, number>;
}

export const DEFAULT_SHIELD_CONFIG: ShieldConfig = {
  maxDepth: 6,
  maxComplexity: 1000,
  listFactorCap: 500,
  fieldWeights: {},
};

export interface NaiveGuardResult {
  allowed: boolean;
  reason: string;
  measuredDepth: number;
  durationMs: number;
  unexpandedSpreads: number;
  visibleRootCount: number;
}

export interface ScoredTreeNode {
  id: string;
  field: string;
  alias?: string;
  weight: number;
  rawListArg?: number;
  listFactor: number;
  listArgCapped: boolean;
  multiplier: number;
  ownCost: number;
  subtreeComplexity: number;
  depth: number;
  subtreeMaxDepth: number;
  expandedFromFragment?: string;
  inlineFragmentType?: string;
  children: ScoredTreeNode[];
}

export interface HardenedStageMetrics {
  spreadsExpanded: number;
  rootNodesScored: number;
  totalNodesScored: number;
  maxMultiplier: number;
  listCappedNodes: number;
  blockedStage: 'NONE' | 'DEPTH_BUDGET' | 'COMPLEXITY_BUDGET';
  circularFragments: string[];
}

export interface HardenedGuardResult {
  allowed: boolean;
  reason: string;
  depth: number;
  complexity: number;
  durationMs: number;
  stageMetrics: HardenedStageMetrics;
  expandedTree: ScoredTreeNode[];
}

export interface SimulatedWorkloadImpact {
  estimatedItemsFetched: number;
  estimatedResolverMs: number;
  naiveWastedMs: number;
  hardenedSavedMs: number;
}

export interface DualAnalysisResult {
  naive: NaiveGuardResult;
  hardened: HardenedGuardResult;
  impact: SimulatedWorkloadImpact;
  flawDetected: {
    aliasAmplificationBypass: boolean;
    fragmentHiddenDepthBypass: boolean;
    listArgBypass: boolean;
    anyBypass: boolean;
  };
}
