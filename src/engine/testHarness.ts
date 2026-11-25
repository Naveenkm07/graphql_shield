import {
  aliasAmplificationAttack,
  buildBenignAST,
  buildBenignPaginatedAST,
  buildCombinedStormAST,
  buildDeepFragments,
  buildListExplosionAST,
} from './fixtures';
import { formatShieldASTToGraphQL } from './graphqlParser';
import { hardenedGuard, naiveGuard } from './shield';
import {
  DEFAULT_SHIELD_CONFIG,
  FragmentMap,
  HardenedGuardResult,
  NaiveGuardResult,
  QueryAST,
  ShieldConfig,
} from './types';

export interface SecurityTestCaseResult {
  id: string;
  group: 'canonical' | 'extended';
  name: string;
  passed: boolean;
  durationMs: number;
  expectedSummary: string;
  actualSummary: string;
  guardUsed: 'naiveGuard' | 'hardenedGuard';
  naiveResult: NaiveGuardResult;
  hardenedResult: HardenedGuardResult;
  assertionCode: string;
  graphql: string;
  ast: { query: QueryAST; fragments: FragmentMap };
}

interface TestSpec {
  id: string;
  group: 'canonical' | 'extended';
  name: string;
  guardUsed: 'naiveGuard' | 'hardenedGuard';
  expectedSummary: string;
  assertionCode: string;
  build: () => { query: QueryAST; fragments: FragmentMap };
  verify: (
    naive: NaiveGuardResult,
    hardened: HardenedGuardResult
  ) => { passed: boolean; actualSummary: string };
}

const TEST_SPECS: TestSpec[] = [
  {
    id: 'canon-1',
    group: 'canonical',
    name: 'Naive limiter allows a normal benign query',
    guardUsed: 'naiveGuard',
    expectedSummary: 'allowed: true, reason: OK',
    assertionCode: `const r = naiveGuard(benignQuery, {});
assert.strictEqual(r.allowed, true);
assert.strictEqual(r.reason, 'OK');`,
    build: buildBenignAST,
    verify: (naive) => ({
      passed: naive.allowed === true && naive.reason === 'OK',
      actualSummary: `allowed: ${naive.allowed}, reason: ${naive.reason}`,
    }),
  },
  {
    id: 'canon-2',
    group: 'canonical',
    name: 'Hardened shield also allows the same benign query',
    guardUsed: 'hardenedGuard',
    expectedSummary: 'allowed: true, reason: OK',
    assertionCode: `const r = hardenedGuard(benignQuery, {});
assert.strictEqual(r.allowed, true);
assert.strictEqual(r.reason, 'OK');`,
    build: buildBenignAST,
    verify: (_naive, hardened) => ({
      passed: hardened.allowed === true && hardened.reason === 'OK',
      actualSummary: `allowed: ${hardened.allowed}, reason: ${hardened.reason} (complexity=${hardened.complexity})`,
    }),
  },
  {
    id: 'canon-3',
    group: 'canonical',
    name: '[FLAW A] Naive limiter is BYPASSED by alias/breadth amplification',
    guardUsed: 'naiveGuard',
    expectedSummary: 'allowed: true (demonstrating bypass at depth <= 6)',
    assertionCode: `const attack = aliasAmplificationAttack(400, 200);
const r = naiveGuard(attack, {});
assert.strictEqual(r.allowed, true); // bypass proven`,
    build: () => ({ query: aliasAmplificationAttack(400, 200), fragments: {} }),
    verify: (naive) => ({
      passed: naive.allowed === true,
      actualSummary: `allowed: ${naive.allowed}, depth: ${naive.measuredDepth}`,
    }),
  },
  {
    id: 'canon-4',
    group: 'canonical',
    name: '[FIXED] Hardened shield BLOCKS the same alias/breadth attack',
    guardUsed: 'hardenedGuard',
    expectedSummary: 'allowed: false, reason matches /COMPLEXITY_EXCEEDED/',
    assertionCode: `const attack = aliasAmplificationAttack(400, 200);
const r = hardenedGuard(attack, {});
assert.strictEqual(r.allowed, false);
assert.match(r.reason, /COMPLEXITY_EXCEEDED/);`,
    build: () => ({ query: aliasAmplificationAttack(400, 200), fragments: {} }),
    verify: (_naive, hardened) => ({
      passed:
        hardened.allowed === false &&
        /COMPLEXITY_EXCEEDED/.test(hardened.reason),
      actualSummary: `allowed: ${hardened.allowed}, reason: ${hardened.reason}`,
    }),
  },
  {
    id: 'canon-5',
    group: 'canonical',
    name: '[FLAW B] Naive limiter is BYPASSED by depth hidden inside a fragment',
    guardUsed: 'naiveGuard',
    expectedSummary: 'allowed: true (treats fragment spread as leaf)',
    assertionCode: `const { query, fragments } = buildDeepFragments(10);
const r = naiveGuard(query, fragments);
assert.strictEqual(r.allowed, true); // bypass proven`,
    build: () => buildDeepFragments(10),
    verify: (naive) => ({
      passed: naive.allowed === true,
      actualSummary: `allowed: ${naive.allowed}, measuredDepth: ${naive.measuredDepth}`,
    }),
  },
  {
    id: 'canon-6',
    group: 'canonical',
    name: '[FIXED] Hardened shield BLOCKS the same fragment-hidden-depth attack',
    guardUsed: 'hardenedGuard',
    expectedSummary: 'allowed: false, reason matches /DEPTH_EXCEEDED/',
    assertionCode: `const { query, fragments } = buildDeepFragments(10);
const r = hardenedGuard(query, fragments);
assert.strictEqual(r.allowed, false);
assert.match(r.reason, /DEPTH_EXCEEDED/);`,
    build: () => buildDeepFragments(10),
    verify: (_naive, hardened) => ({
      passed:
        hardened.allowed === false && /DEPTH_EXCEEDED/.test(hardened.reason),
      actualSummary: `allowed: ${hardened.allowed}, reason: ${hardened.reason}`,
    }),
  },
  // Extended adversarial suite
  {
    id: 'ext-1',
    group: 'extended',
    name: '[FLAW C] Naive limiter ignores first: 10000 list argument explosion',
    guardUsed: 'naiveGuard',
    expectedSummary: 'allowed: true (ignores arguments)',
    assertionCode: `const { query, fragments } = buildListExplosionAST(10000);
const r = naiveGuard(query, fragments);
assert.strictEqual(r.allowed, true);`,
    build: () => buildListExplosionAST(10000),
    verify: (naive) => ({
      passed: naive.allowed === true,
      actualSummary: `allowed: ${naive.allowed}, measuredDepth: ${naive.measuredDepth}`,
    }),
  },
  {
    id: 'ext-2',
    group: 'extended',
    name: '[FIXED] Hardened shield caps listFactor at 500 and blocks explosion',
    guardUsed: 'hardenedGuard',
    expectedSummary: 'allowed: false, listCappedNodes >= 1, COMPLEXITY_EXCEEDED',
    assertionCode: `const { query, fragments } = buildListExplosionAST(10000);
const r = hardenedGuard(query, fragments);
assert.strictEqual(r.allowed, false);
assert.ok(r.stageMetrics.listCappedNodes >= 1);`,
    build: () => buildListExplosionAST(10000),
    verify: (_naive, hardened) => ({
      passed:
        hardened.allowed === false &&
        hardened.stageMetrics.listCappedNodes >= 1 &&
        /COMPLEXITY_EXCEEDED/.test(hardened.reason),
      actualSummary: `allowed: ${hardened.allowed}, reason: ${hardened.reason}, cappedNodes: ${hardened.stageMetrics.listCappedNodes}`,
    }),
  },
  {
    id: 'ext-3',
    group: 'extended',
    name: '[FIXED] Hardened shield stops combined fragment + alias + nested list storm',
    guardUsed: 'hardenedGuard',
    expectedSummary: 'allowed: false, COMPLEXITY_EXCEEDED',
    assertionCode: `const { query, fragments } = buildCombinedStormAST();
const r = hardenedGuard(query, fragments);
assert.strictEqual(r.allowed, false);`,
    build: buildCombinedStormAST,
    verify: (_naive, hardened) => ({
      passed:
        hardened.allowed === false &&
        /COMPLEXITY_EXCEEDED/.test(hardened.reason),
      actualSummary: `allowed: ${hardened.allowed}, reason: ${hardened.reason}`,
    }),
  },
  {
    id: 'ext-4',
    group: 'extended',
    name: 'Hardened shield permits bounded multi-level pagination without false positives',
    guardUsed: 'hardenedGuard',
    expectedSummary: 'allowed: true, complexity <= maxComplexity',
    assertionCode: `const { query, fragments } = buildBenignPaginatedAST();
const r = hardenedGuard(query, fragments);
assert.strictEqual(r.allowed, true);`,
    build: buildBenignPaginatedAST,
    verify: (_naive, hardened) => ({
      passed: hardened.allowed === true && hardened.reason === 'OK',
      actualSummary: `allowed: ${hardened.allowed}, depth: ${hardened.depth}, complexity: ${hardened.complexity}`,
    }),
  },
  {
    id: 'ext-5',
    group: 'extended',
    name: 'Naive limiter still blocks naive raw query exceeding depth 6',
    guardUsed: 'naiveGuard',
    expectedSummary: 'allowed: false, DEPTH_EXCEEDED(7)',
    assertionCode: `const r = naiveGuard(rawDepth7Query, {});
assert.strictEqual(r.allowed, false);
assert.match(r.reason, /DEPTH_EXCEEDED/);`,
    build: () => ({
      query: {
        selections: [
          {
            name: 'l1',
            selections: [
              {
                name: 'l2',
                selections: [
                  {
                    name: 'l3',
                    selections: [
                      {
                        name: 'l4',
                        selections: [
                          {
                            name: 'l5',
                            selections: [
                              { name: 'l6', selections: [{ name: 'l7' }] },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      fragments: {},
    }),
    verify: (naive) => ({
      passed: naive.allowed === false && /DEPTH_EXCEEDED/.test(naive.reason),
      actualSummary: `allowed: ${naive.allowed}, reason: ${naive.reason}`,
    }),
  },
  {
    id: 'ext-6',
    group: 'extended',
    name: 'Circular fragment spread terminates safely without infinite recursion',
    guardUsed: 'hardenedGuard',
    expectedSummary: 'terminates with circularFragments detected',
    assertionCode: `const r = hardenedGuard(cyclicQuery, cyclicFragments);
assert.ok(r.stageMetrics.circularFragments.length >= 1);`,
    build: () => ({
      query: { selections: [{ fragmentSpread: 'CycleA' }] },
      fragments: {
        CycleA: {
          name: 'CycleA',
          typeCondition: 'Node',
          selections: [{ name: 'id' }, { fragmentSpread: 'CycleB' }],
        },
        CycleB: {
          name: 'CycleB',
          typeCondition: 'Node',
          selections: [{ name: 'name' }, { fragmentSpread: 'CycleA' }],
        },
      },
    }),
    verify: (_naive, hardened) => ({
      passed: hardened.stageMetrics.circularFragments.length >= 1,
      actualSummary: `allowed: ${hardened.allowed}, cycles: [${hardened.stageMetrics.circularFragments.join(', ')}]`,
    }),
  },
];

export function runSecurityTestSuite(
  config: ShieldConfig = DEFAULT_SHIELD_CONFIG
): SecurityTestCaseResult[] {
  return TEST_SPECS.map((spec) => {
    const start =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const ast = spec.build();
    const naiveResult = naiveGuard(ast.query, ast.fragments, config);
    const hardenedResult = hardenedGuard(ast.query, ast.fragments, config);
    const verification = spec.verify(naiveResult, hardenedResult);
    const durationMs = Number(
      Math.max(
        0.02,
        (typeof performance !== 'undefined' ? performance.now() : Date.now()) -
          start
      ).toFixed(2)
    );

    return {
      id: spec.id,
      group: spec.group,
      name: spec.name,
      passed: verification.passed,
      durationMs,
      expectedSummary: spec.expectedSummary,
      actualSummary: verification.actualSummary,
      guardUsed: spec.guardUsed,
      naiveResult,
      hardenedResult,
      assertionCode: spec.assertionCode,
      graphql: formatShieldASTToGraphQL(ast.query, ast.fragments, 'TestQuery'),
      ast,
    };
  });
}
