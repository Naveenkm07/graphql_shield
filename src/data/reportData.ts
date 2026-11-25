export const REPORT_METADATA = {
  institution: 'New Horizon College of Engineering',
  department: 'Department of Computer Science and Engineering',
  academicYear: '2026–2027',
  assessmentTitle: 'AAT-2: AI-Augmented Development (10 Marks)',
  course: 'Full Stack Technologies – 22CSE71',
  projectTitle:
    'AI-Augmented Adaptive GraphQL Query-Cost Shield Against Nested-Query Denial-of-Service Attacks',
  shortTitle: 'Adaptive GraphQL Query-Cost Shield',
  studentName: 'Naveen Kumar KM',
  usn: '1NH24CS409',
  semesterSection: '7B',
  aiToolsSummary: 'Claude Sonnet, GitHub Copilot & Google Gemini',
};

export interface AiToolEntry {
  tool: string;
  role: string;
  justification: string;
}

export const AI_TOOLS_TABLE: AiToolEntry[] = [
  {
    tool: 'Claude Sonnet (Anthropic)',
    role: 'Architecture Design & Deep Flaw Discovery',
    justification:
      'Multi-turn architectural design of the AST-walking algorithm and adversarial-query probing under realistic traffic shapes.',
  },
  {
    tool: 'GitHub Copilot (OpenAI Codex)',
    role: 'Inline Autocompletion & Test Fixtures',
    justification:
      'Accelerated authoring of synthetic query-AST fixtures and repetitive Jest-style assertions.',
  },
  {
    tool: 'Google Gemini',
    role: 'GraphQL Spec Cross-Audit',
    justification:
      'Cross-verified fragment-spread semantics and cost-analysis conventions comparable to libraries such as graphql-cost-analysis.',
  },
];

export interface PromptEvolutionStep {
  step: string;
  title: string;
  prompt: string;
  outcome: string;
}

export const PROMPT_EVOLUTION: PromptEvolutionStep[] = [
  {
    step: 'Prompt 1',
    title: 'Initial Architecture Scaffolding',
    prompt:
      'Act as a senior full-stack API security engineer. Write a GraphQL query-depth limiter middleware in Node.js, with no external dependencies, that rejects any query nested deeper than 6 levels.',
    outcome:
      'Produced `naiveGuard`: recurses selection sets up to `MAX_DEPTH = 6`, treats fragment spreads as a single leaf, and ignores all list arguments.',
  },
  {
    step: 'Prompt 2',
    title: 'Adversarial Probing',
    prompt:
      'If I send a query with 400 aliases of the same list field, each returning 200 items, but the nesting never goes past 3 levels deep, does your limiter still catch it? What about a query whose real depth is hidden inside a GraphQL fragment definition?',
    outcome:
      'Surfaced four concrete bypasses: Breadth/Alias Amplification, Fragment-Hidden Depth, Unweighted List Arguments, and Late Rejection.',
  },
  {
    step: 'Prompt 3',
    title: 'Hardening Request',
    prompt:
      'Fix the bypasses you just identified. The shield must expand fragments before measuring depth, must price list arguments like first/limit multiplicatively, and must reject a request before any resolver work runs — not after.',
    outcome:
      'Guided the 5-stage `hardenedGuard` implementation: fragment expansion, per-alias independent scoring, multiplicative list factor (capped at 500), and static pre-execution rejection (`MAX_DEPTH = 6`, `MAX_COMPLEXITY = 1000`).',
  },
];

export interface FlawAuditItem {
  id: string;
  title: string;
  flawDescription: string;
  fixTitle: string;
  fixDescription: string;
  baselineBehavior: string;
  hardenedBehavior: string;
}

export const FLAWS_AND_FIXES: FlawAuditItem[] = [
  {
    id: 'Flaw 1',
    title: 'Breadth / Alias Amplification Bypass',
    flawDescription:
      'A query requesting the same expensive list field under 400 different aliases, each pulling 200 items, never nests past depth 3. The naive walker only measures depth, waving through 400 × 200 = 80,000 items.',
    fixTitle: 'Per-Alias, Per-Node Scoring (Fix 1)',
    fixDescription:
      'Every alias is walked and scored as its own independent subtree (`complexity += r.complexity`) instead of being collapsed by depth.',
    baselineBehavior: 'Fails — aliases never raise measured depth',
    hardenedBehavior: 'Each alias scored as its own node; complexity budget enforced',
  },
  {
    id: 'Flaw 2',
    title: 'Fragment-Hidden Depth',
    flawDescription:
      'Naive walker treats a `fragmentSpread` as a single leaf (`depth + 1`) and never opens the fragment definition. An attacker nests 10+ real levels inside fragments while the query body looks 2–3 levels deep.',
    fixTitle: 'Fragment Expansion Before Measurement (Fix 2)',
    fixDescription:
      '`expand(selections, fragments)` recursively resolves and splices every `fragmentSpread` into the AST in place before measuring depth or complexity.',
    baselineBehavior: 'Spreads never expanded — real depth hidden',
    hardenedBehavior: 'Fragments fully expanded before any measurement',
  },
  {
    id: 'Flaw 3',
    title: 'No Cost Weighting for List Arguments',
    flawDescription:
      '`first` / `limit` arguments are ignored entirely, so a field returning 1 item and a field returning 10,000 items under `first: 10000` are priced identically — zero argument weight.',
    fixTitle: 'Multiplicative List-Argument Cost (Fix 3)',
    fixDescription:
      '`listFactor = Math.min(sel.args.first || sel.args.limit, 500)` multiplies the weight of everything nested beneath that field.',
    baselineBehavior: 'Ignored',
    hardenedBehavior: 'first/limit multiplies cost down the subtree (cap 500/node)',
  },
  {
    id: 'Flaw 4',
    title: 'Late Rejection',
    flawDescription:
      'Without a static complexity score to check before a resolver runs, CPU time is wasted on partial work that gets thrown away only when a runtime limit hits.',
    fixTitle: 'Static Pre-Execution Rejection (Fix 4)',
    fixDescription:
      'The complete expanded AST is scored statically for depth (`> 6`) and complexity (`> 1000`) before any resolver runs.',
    baselineBehavior: 'After partial execution in practice',
    hardenedBehavior: 'Static analysis, before any resolver runs',
  },
];

export const NAIVE_BASELINE_CODE = `const MAX_DEPTH = 6;

function naiveDepthOf(selections, fragments, depth = 1) {
  let max = depth;
  for (const sel of selections) {
    if (sel.fragmentSpread) {
      // [FLAW 2] treats a fragment spread as one leaf node, never opens it
      max = Math.max(max, depth + 1);
      continue;
    }
    if (sel.selections && sel.selections.length) {
      max = Math.max(max, naiveDepthOf(sel.selections, fragments, depth + 1));
    }
  }
  return max;
}

function naiveGuard(query, fragments) {
  // [FLAW 1 & 3] ignores aliases breadth and first/limit arguments
  const depth = naiveDepthOf(query.selections, fragments);
  if (depth > MAX_DEPTH) {
    return { allowed: false, reason: \`DEPTH_EXCEEDED(\${depth})\` };
  }
  return { allowed: true, reason: 'OK' };
}

module.exports = { naiveGuard, MAX_DEPTH };`;

export const HARDENED_SHIELD_CODE = `const MAX_DEPTH = 6;
const MAX_COMPLEXITY = 1000;

function expand(selections, fragments) {
  const out = [];
  for (const sel of selections) {
    if (sel.fragmentSpread) {
      const frag = fragments[sel.fragmentSpread];
      if (!frag) continue;
      out.push(...expand(frag.selections, fragments)); // Fix 2: splice fragments
    } else {
      out.push({
        ...sel,
        selections: sel.selections ? expand(sel.selections, fragments) : [],
      });
    }
  }
  return out;
}

function scoreNode(sel, depth, multiplier) {
  const weight = sel.weight || 1;
  const listFactor = sel.args && (sel.args.first || sel.args.limit)
    ? Math.min(sel.args.first || sel.args.limit, 500) // Fix 3: list multiplier cap
    : 1;
  const ownCost = weight * multiplier;
  let childDepth = depth, childCost = ownCost;
  for (const child of sel.selections || []) {
    const r = scoreNode(child, depth + 1, multiplier * listFactor);
    childDepth = Math.max(childDepth, r.depth);
    childCost += r.complexity;
  }
  return { depth: childDepth, complexity: childCost };
}

function hardenedGuard(query, fragments) {
  const expanded = expand(query.selections, fragments); // Fix 2
  let depth = 1, complexity = 0;
  for (const sel of expanded) { // Fix 1: each alias scored independently
    const r = scoreNode(sel, 1, 1);
    depth = Math.max(depth, r.depth);
    complexity += r.complexity;
  }
  if (depth > MAX_DEPTH) { // Fix 4: reject before any resolver work
    return { allowed: false, reason: \`DEPTH_EXCEEDED(\${depth})\` };
  }
  if (complexity > MAX_COMPLEXITY) {
    return { allowed: false, reason: \`COMPLEXITY_EXCEEDED(\${complexity})\` };
  }
  return { allowed: true, reason: 'OK' };
}`;

export interface EngineeringTimeRow {
  phase: string;
  traditionalHours: number;
  aiAugmentedHours: number;
  speedup: string;
}

export const ENGINEERING_COMPARISON: EngineeringTimeRow[] = [
  {
    phase: 'Architecture scaffolding',
    traditionalHours: 3.0,
    aiAugmentedHours: 0.6,
    speedup: '5.0×',
  },
  {
    phase: 'Adversarial query design & flaw discovery',
    traditionalHours: 4.5,
    aiAugmentedHours: 1.2,
    speedup: '3.8×',
  },
  {
    phase: 'Test suite & benchmark authoring',
    traditionalHours: 3.5,
    aiAugmentedHours: 1.0,
    speedup: '3.5×',
  },
  {
    phase: 'Documentation & reporting',
    traditionalHours: 2.5,
    aiAugmentedHours: 0.7,
    speedup: '3.6×',
  },
  {
    phase: 'Total Engineering Time',
    traditionalHours: 13.5,
    aiAugmentedHours: 3.5,
    speedup: '3.9×',
  },
];

export const AI_LIMITATIONS = [
  {
    title: 'The "Plausible Correctness" Trap',
    detail:
      'The baseline depth limiter reads as reasonable, compiles, and passes an obvious single-query test — its blind spots only surface under deliberately adversarial input.',
  },
  {
    title: 'No Domain-Specific Intuition',
    detail:
      'The AI did not independently flag GraphQL-specific attack classes (aliasing, fragment hiding, list-argument cost) until explicitly prompted to consider them.',
  },
  {
    title: 'Static Analysis Is Still a Heuristic',
    detail:
      'The complexity budget uses fixed field weights and a per-node cap on list arguments; a production deployment needs per-field cost calibration against real resolver latency.',
  },
];
