import { describe, expect, it } from 'vitest';
import {
  getReportBaselineBenchmark,
  runLiveBenchmark,
} from '../benchmark';
import {
  aliasAmplificationAttack,
  buildBenignAST,
  buildDeepFragments,
  buildListExplosionAST,
} from '../fixtures';
import {
  formatShieldASTToGraphQL,
  parseGraphQLToShieldAST,
  parseJsonToShieldAST,
} from '../graphqlParser';
import { analyzeDualGuards, hardenedGuard, naiveGuard } from '../shield';
import { runSecurityTestSuite } from '../testHarness';
import { DEFAULT_SHIELD_CONFIG } from '../types';

describe('GraphQL Query-Cost Shield Engine', () => {
  it('allows normal benign query in both naive and hardened guards', () => {
    const { query, fragments } = buildBenignAST();
    const naive = naiveGuard(query, fragments);
    const hardened = hardenedGuard(query, fragments);

    expect(naive.allowed).toBe(true);
    expect(naive.reason).toBe('OK');
    expect(hardened.allowed).toBe(true);
    expect(hardened.reason).toBe('OK');
    expect(hardened.depth).toBe(3);
    expect(hardened.complexity).toBe(15);
  });

  it('demonstrates Flaw 1 bypass in naiveGuard and blocks 400x200 alias amplification in hardenedGuard', () => {
    const attack = aliasAmplificationAttack(400, 200);
    const naive = naiveGuard(attack, {});
    const hardened = hardenedGuard(attack, {});

    expect(naive.allowed).toBe(true);
    expect(naive.measuredDepth).toBe(2);
    expect(hardened.allowed).toBe(false);
    expect(hardened.reason).toMatch(/COMPLEXITY_EXCEEDED/);
    expect(hardened.complexity).toBe(80400);
  });

  it('demonstrates Flaw 2 bypass in naiveGuard and blocks 10-level hidden fragment depth in hardenedGuard', () => {
    const { query, fragments } = buildDeepFragments(10);
    const naive = naiveGuard(query, fragments);
    const hardened = hardenedGuard(query, fragments);

    expect(naive.allowed).toBe(true);
    expect(naive.measuredDepth).toBe(2);
    expect(hardened.allowed).toBe(false);
    expect(hardened.reason).toBe('DEPTH_EXCEEDED(10)');
    expect(hardened.stageMetrics.spreadsExpanded).toBe(10);
  });

  it('caps list factor at 500 per node and multiplies nested cost (Flaw 3 fix)', () => {
    const { query, fragments } = buildListExplosionAST(10000);
    const naive = naiveGuard(query, fragments);
    const hardened = hardenedGuard(query, fragments);

    expect(naive.allowed).toBe(true);
    expect(hardened.allowed).toBe(false);
    expect(hardened.stageMetrics.listCappedNodes).toBe(1);
    expect(hardened.stageMetrics.maxMultiplier).toBe(5000);
    expect(hardened.complexity).toBe(12001);
  });

  it('detects circular fragments gracefully without infinite recursion', () => {
    const res = hardenedGuard(
      { selections: [{ fragmentSpread: 'A' }] },
      {
        A: { name: 'A', selections: [{ name: 'id' }, { fragmentSpread: 'B' }] },
        B: { name: 'B', selections: [{ name: 'name' }, { fragmentSpread: 'A' }] },
      }
    );

    expect(res.allowed).toBe(true);
    expect(res.stageMetrics.circularFragments).toContain('A');
  });

  it('applies custom field weights from ShieldConfig', () => {
    const { query, fragments } = buildBenignAST();
    const res = hardenedGuard(query, fragments, {
      ...DEFAULT_SHIELD_CONFIG,
      fieldWeights: { user: 10, posts: 20 },
    });

    // user: 10, id/name/email: 3, posts: 20, id/title * 5: 10 => 43
    expect(res.complexity).toBe(43);
  });

  it('identifies bypass telemetry accurately via analyzeDualGuards', () => {
    const { query, fragments } = buildDeepFragments(10);
    const dual = analyzeDualGuards(query, fragments);

    expect(dual.flawDetected.anyBypass).toBe(true);
    expect(dual.flawDetected.fragmentHiddenDepthBypass).toBe(true);
    expect(dual.impact.hardenedSavedMs).toBeGreaterThan(0);
  });
});

describe('GraphQL Query-to-AST Compiler', () => {
  it('parses real GraphQL syntax with aliases, list args, inline fragments, and named fragments', () => {
    const gql = `
      query AuditSample {
        firstAlias: users(first: 25) {
          id
          ... on AdminUser {
            permissions
          }
          ...UserPosts
        }
      }
      fragment UserPosts on User {
        posts(limit: 4) {
          id
          title
        }
      }
    `;

    const parsed = parseGraphQLToShieldAST(gql);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const hardened = hardenedGuard(parsed.query, parsed.fragments);
    // firstAlias: 1 -> id: 25, permissions: 25, posts: 25 -> (id: 100, title: 100) => 276
    expect(hardened.depth).toBe(3);
    expect(hardened.complexity).toBe(276);
    expect(hardened.allowed).toBe(true);

    const formatted = formatShieldASTToGraphQL(parsed.query, parsed.fragments);
    expect(formatted).toContain('firstAlias: users(first: 25)');
    expect(formatted).toContain('fragment UserPosts on User');
  });

  it('reports syntax errors cleanly with line/column info', () => {
    const parsed = parseGraphQLToShieldAST('query Broken { users { ');
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.line).toBeDefined();
  });

  it('parses valid raw JSON AST payloads', () => {
    const parsed = parseJsonToShieldAST(
      JSON.stringify({
        query: { selections: [{ name: 'health' }] },
        fragments: {},
      })
    );
    expect(parsed.ok).toBe(true);
  });
});

describe('Security Harness & Benchmark Suite', () => {
  it('passes all 6 canonical tests and all 6 extended tests under default config', () => {
    const results = runSecurityTestSuite(DEFAULT_SHIELD_CONFIG);
    expect(results).toHaveLength(12);
    expect(results.every((r) => r.passed)).toBe(true);
  });

  it('produces exact report baseline benchmark numbers (863.4 ms -> 5.1 ms)', () => {
    const baseline = getReportBaselineBenchmark();
    expect(baseline.totalRequests).toBe(50);
    expect(baseline.naiveAllowed).toBe(50);
    expect(baseline.hardenedBlocked).toBe(10);
    expect(baseline.naiveTotalWallMs).toBe(863.4);
    expect(baseline.hardenedTotalWallMs).toBe(5.1);
  });

  it('runs a live mixed-traffic simulation blocking all adversarial categories', () => {
    const live = runLiveBenchmark({
      totalRequests: 40,
      benignShare: 50,
      aliasShare: 20,
      fragmentShare: 20,
      listShare: 10,
      aliasCount: 400,
      fragmentDepth: 10,
    });

    expect(live.totalRequests).toBe(40);
    expect(live.hardenedAllowed).toBe(20);
    expect(live.hardenedBlocked).toBe(20);
    expect(live.hardenedTotalWallMs).toBeLessThan(live.naiveTotalWallMs);
  });
});
