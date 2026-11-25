import {
  aliasAmplificationAttack,
  buildBenignAST,
  buildBenignPaginatedAST,
  buildDeepFragments,
  buildListExplosionAST,
} from './fixtures';
import { estimateWorkloadImpact, hardenedGuard, naiveGuard } from './shield';
import { DEFAULT_SHIELD_CONFIG, ShieldConfig } from './types';

export type TrafficCategory =
  | 'benign'
  | 'alias-amplification'
  | 'fragment-hidden-depth'
  | 'list-arg-explosion';

export interface BenchmarkRequestRecord {
  index: number;
  category: TrafficCategory;
  label: string;
  naiveAllowed: boolean;
  naiveDepth: number;
  naiveMs: number;
  hardenedAllowed: boolean;
  hardenedReason: string;
  hardenedDepth: number;
  hardenedComplexity: number;
  hardenedMs: number;
}

export interface BenchmarkCategoryBreakdown {
  category: TrafficCategory;
  label: string;
  count: number;
  naiveAvgMs: number;
  hardenedAvgMs: number;
  naiveAllowedCount: number;
  hardenedBlockedCount: number;
}

export interface BenchmarkSummary {
  mode: 'report-baseline' | 'live-simulation';
  totalRequests: number;
  naiveAllowed: number;
  naiveBlocked: number;
  hardenedAllowed: number;
  hardenedBlocked: number;
  naiveTotalWallMs: number;
  hardenedTotalWallMs: number;
  speedupRatio: number;
  categoryBreakdown: BenchmarkCategoryBreakdown[];
  requests: BenchmarkRequestRecord[];
}

export interface LiveBenchmarkConfig {
  totalRequests: number;
  benignShare: number;
  aliasShare: number;
  fragmentShare: number;
  listShare: number;
  aliasCount: number;
  fragmentDepth: number;
}

export const DEFAULT_LIVE_BENCHMARK_CONFIG: LiveBenchmarkConfig = {
  totalRequests: 50,
  benignShare: 80,
  aliasShare: 10,
  fragmentShare: 10,
  listShare: 0,
  aliasCount: 400,
  fragmentDepth: 10,
};

/**
 * Generates exact report baseline benchmark summary matching Figures 8.1, 8.3 & Section 8.4
 * of `AAT2_GraphQL_Shield_Report.pdf`.
 */
export function getReportBaselineBenchmark(): BenchmarkSummary {
  const requests: BenchmarkRequestRecord[] = [];
  // 40 benign requests + 5 alias/breadth attacks + 5 fragment-hidden depth attacks = 50 mixed requests
  for (let i = 1; i <= 50; i++) {
    if (i <= 40) {
      requests.push({
        index: i,
        category: 'benign',
        label: 'Benign query',
        naiveAllowed: true,
        naiveDepth: 3,
        naiveMs: 0.13,
        hardenedAllowed: true,
        hardenedReason: 'OK',
        hardenedDepth: 3,
        hardenedComplexity: 15,
        hardenedMs: 0.017,
      });
    } else if (i <= 45) {
      requests.push({
        index: i,
        category: 'alias-amplification',
        label: 'Alias/breadth amplification (400×200)',
        naiveAllowed: true,
        naiveDepth: 2,
        naiveMs: 171.62,
        hardenedAllowed: false,
        hardenedReason: 'COMPLEXITY_EXCEEDED(80400)',
        hardenedDepth: 2,
        hardenedComplexity: 80400,
        hardenedMs: 0.87,
      });
    } else {
      requests.push({
        index: i,
        category: 'fragment-hidden-depth',
        label: 'Fragment-hidden depth (10 levels)',
        naiveAllowed: true,
        naiveDepth: 2,
        naiveMs: 0.02,
        hardenedAllowed: false,
        hardenedReason: 'DEPTH_EXCEEDED(10)',
        hardenedDepth: 10,
        hardenedComplexity: 10,
        hardenedMs: 0.014,
      });
    }
  }

  return {
    mode: 'report-baseline',
    totalRequests: 50,
    naiveAllowed: 50,
    naiveBlocked: 0,
    hardenedAllowed: 40,
    hardenedBlocked: 10,
    naiveTotalWallMs: 863.4,
    hardenedTotalWallMs: 5.1,
    speedupRatio: Number((863.4 / 5.1).toFixed(1)),
    categoryBreakdown: [
      {
        category: 'benign',
        label: 'Benign query',
        count: 40,
        naiveAvgMs: 0.13,
        hardenedAvgMs: 0.017,
        naiveAllowedCount: 40,
        hardenedBlockedCount: 0,
      },
      {
        category: 'alias-amplification',
        label: 'Alias/breadth amplification',
        count: 5,
        naiveAvgMs: 171.62,
        hardenedAvgMs: 0.87,
        naiveAllowedCount: 5,
        hardenedBlockedCount: 5,
      },
      {
        category: 'fragment-hidden-depth',
        label: 'Fragment-hidden depth',
        count: 5,
        naiveAvgMs: 0.02,
        hardenedAvgMs: 0.014,
        naiveAllowedCount: 5,
        hardenedBlockedCount: 5,
      },
    ],
    requests,
  };
}

/**
 * Executes a real in-browser benchmark across N generated AST queries,
 * measuring real JS guard time plus simulated resolver cost when allowed.
 */
export function runLiveBenchmark(
  simConfig: LiveBenchmarkConfig = DEFAULT_LIVE_BENCHMARK_CONFIG,
  shieldConfig: ShieldConfig = DEFAULT_SHIELD_CONFIG
): BenchmarkSummary {
  const total = Math.max(10, Math.min(200, simConfig.totalRequests));
  const shareSum = Math.max(
    1,
    simConfig.benignShare +
      simConfig.aliasShare +
      simConfig.fragmentShare +
      simConfig.listShare
  );

  const aliasCount = Math.round((total * simConfig.aliasShare) / shareSum);
  const fragCount = Math.round((total * simConfig.fragmentShare) / shareSum);
  const listCount = Math.round((total * simConfig.listShare) / shareSum);
  const benignCount = Math.max(0, total - aliasCount - fragCount - listCount);

  const schedule: TrafficCategory[] = [
    ...Array<TrafficCategory>(benignCount).fill('benign'),
    ...Array<TrafficCategory>(aliasCount).fill('alias-amplification'),
    ...Array<TrafficCategory>(fragCount).fill('fragment-hidden-depth'),
    ...Array<TrafficCategory>(listCount).fill('list-arg-explosion'),
  ];

  // Build reusable payloads for each category
  const benignProfile = buildBenignAST();
  const benignPaged = buildBenignPaginatedAST();
  const aliasAttack = {
    query: aliasAmplificationAttack(simConfig.aliasCount, 200),
    fragments: {},
  };
  const fragAttack = buildDeepFragments(simConfig.fragmentDepth);
  const listAttack = buildListExplosionAST(10000);

  const requests: BenchmarkRequestRecord[] = [];
  const categoryStats = new Map<
    TrafficCategory,
    {
      label: string;
      count: number;
      naiveSum: number;
      hardenedSum: number;
      naiveAllowedCount: number;
      hardenedBlockedCount: number;
    }
  >();

  const labelFor = (c: TrafficCategory): string => {
    switch (c) {
      case 'benign':
        return 'Benign query';
      case 'alias-amplification':
        return 'Alias/breadth amplification';
      case 'fragment-hidden-depth':
        return 'Fragment-hidden depth';
      case 'list-arg-explosion':
        return 'List-arg explosion';
    }
  };

  let naiveAllowed = 0;
  let hardenedAllowed = 0;
  let naiveTotalWallMs = 0;
  let hardenedTotalWallMs = 0;

  schedule.forEach((cat, idx) => {
    const payload =
      cat === 'benign'
        ? idx % 2 === 0
          ? benignProfile
          : benignPaged
        : cat === 'alias-amplification'
          ? aliasAttack
          : cat === 'fragment-hidden-depth'
            ? fragAttack
            : listAttack;

    const naive = naiveGuard(payload.query, payload.fragments, shieldConfig);
    const hardened = hardenedGuard(
      payload.query,
      payload.fragments,
      shieldConfig
    );
    const impact = estimateWorkloadImpact(naive, hardened);

    // Total cost incurred = guard overhead + simulated resolver CPU if request was allowed through!
    const naiveCostMs = Number(
      (
        naive.durationMs +
        (naive.allowed
          ? cat === 'benign'
            ? 0.13
            : impact.estimatedResolverMs
          : 0)
      ).toFixed(3)
    );
    const hardenedCostMs = Number(
      (
        hardened.durationMs +
        (hardened.allowed
          ? cat === 'benign'
            ? 0.13
            : impact.estimatedResolverMs
          : 0)
      ).toFixed(3)
    );

    if (naive.allowed) naiveAllowed += 1;
    if (hardened.allowed) hardenedAllowed += 1;
    naiveTotalWallMs += naiveCostMs;
    hardenedTotalWallMs += hardenedCostMs;

    const existing = categoryStats.get(cat) ?? {
      label: labelFor(cat),
      count: 0,
      naiveSum: 0,
      hardenedSum: 0,
      naiveAllowedCount: 0,
      hardenedBlockedCount: 0,
    };
    existing.count += 1;
    existing.naiveSum += naiveCostMs;
    existing.hardenedSum += hardenedCostMs;
    if (naive.allowed) existing.naiveAllowedCount += 1;
    if (!hardened.allowed) existing.hardenedBlockedCount += 1;
    categoryStats.set(cat, existing);

    requests.push({
      index: idx + 1,
      category: cat,
      label: labelFor(cat),
      naiveAllowed: naive.allowed,
      naiveDepth: naive.measuredDepth,
      naiveMs: naiveCostMs,
      hardenedAllowed: hardened.allowed,
      hardenedReason: hardened.reason,
      hardenedDepth: hardened.depth,
      hardenedComplexity: hardened.complexity,
      hardenedMs: hardenedCostMs,
    });
  });

  const categoryBreakdown: BenchmarkCategoryBreakdown[] = Array.from(
    categoryStats.entries()
  ).map(([category, st]) => ({
    category,
    label: st.label,
    count: st.count,
    naiveAvgMs: Number((st.naiveSum / Math.max(1, st.count)).toFixed(3)),
    hardenedAvgMs: Number((st.hardenedSum / Math.max(1, st.count)).toFixed(3)),
    naiveAllowedCount: st.naiveAllowedCount,
    hardenedBlockedCount: st.hardenedBlockedCount,
  }));

  const safeHardenedTotal = Math.max(0.1, Number(hardenedTotalWallMs.toFixed(1)));
  const safeNaiveTotal = Number(naiveTotalWallMs.toFixed(1));

  return {
    mode: 'live-simulation',
    totalRequests: total,
    naiveAllowed,
    naiveBlocked: total - naiveAllowed,
    hardenedAllowed,
    hardenedBlocked: total - hardenedAllowed,
    naiveTotalWallMs: safeNaiveTotal,
    hardenedTotalWallMs: safeHardenedTotal,
    speedupRatio: Number((safeNaiveTotal / safeHardenedTotal).toFixed(1)),
    categoryBreakdown,
    requests,
  };
}
