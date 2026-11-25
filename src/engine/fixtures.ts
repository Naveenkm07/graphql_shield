import { formatShieldASTToGraphQL } from './graphqlParser';
import { FragmentMap, QueryAST, SelectionNode } from './types';

export interface ScenarioPreset {
  id: string;
  title: string;
  shortLabel: string;
  category: 'benign' | 'attack';
  flawTag: string;
  summary: string;
  expectedNaive: 'ALLOW' | 'BLOCK';
  expectedHardened: 'ALLOW' | 'BLOCK';
  graphql: string;
  ast: { query: QueryAST; fragments: FragmentMap };
}

export function buildBenignAST(): { query: QueryAST; fragments: FragmentMap } {
  return {
    query: {
      selections: [
        {
          name: 'user',
          args: { id: 'u_104' },
          selections: [
            { name: 'id' },
            { name: 'name' },
            { name: 'email' },
            {
              name: 'posts',
              args: { first: 5 },
              selections: [{ name: 'id' }, { name: 'title' }],
            },
          ],
        },
      ],
    },
    fragments: {},
  };
}

/**
 * Generates an Alias / Breadth Amplification attack matching report Section 6.1 & 8.2:
 * `aliasAmplificationAttack(400, 200)` -> 400 aliases, each pulling 200 items, depth = 2.
 */
export function aliasAmplificationAttack(
  aliasCount = 400,
  firstCount = 200
): QueryAST {
  const selections: SelectionNode[] = [];
  for (let i = 0; i < aliasCount; i++) {
    selections.push({
      alias: `a${i}`,
      name: 'users',
      args: { first: firstCount },
      selections: [{ name: 'id' }],
    });
  }
  return { selections };
}

/**
 * Generates a Fragment-Hidden Depth attack matching report Section 8.2:
 * `buildDeepFragments(10)` -> visible query has 1 spread (naive depth = 2),
 * real expanded depth is `levels` (10).
 */
export function buildDeepFragments(levels = 10): {
  query: QueryAST;
  fragments: FragmentMap;
} {
  const fragments: FragmentMap = {};
  for (let i = 1; i <= levels; i++) {
    const fragName = `Frag${i}`;
    const nextSpread = i < levels ? `Frag${i + 1}` : undefined;
    fragments[fragName] = {
      name: fragName,
      typeCondition: 'Node',
      selections: nextSpread
        ? [
            {
              name: `level${i}`,
              selections: [{ fragmentSpread: nextSpread }],
            },
          ]
        : [{ name: `level${i}` }],
    };
  }

  return {
    query: {
      selections: [{ fragmentSpread: 'Frag1' }],
    },
    fragments,
  };
}

export function buildListExplosionAST(firstCount = 10000): {
  query: QueryAST;
  fragments: FragmentMap;
} {
  return {
    query: {
      selections: [
        {
          name: 'orders',
          args: { first: firstCount },
          selections: [
            { name: 'id' },
            { name: 'status' },
            { name: 'totalAmount' },
            {
              name: 'lineItems',
              args: { limit: 10 },
              selections: [{ name: 'sku' }, { name: 'quantity' }],
            },
          ],
        },
      ],
    },
    fragments: {},
  };
}

export function buildCombinedStormAST(): {
  query: QueryAST;
  fragments: FragmentMap;
} {
  return {
    query: {
      selections: [
        { alias: 'shardA', name: 'organization', selections: [{ fragmentSpread: 'OrgFanout' }] },
        { alias: 'shardB', name: 'organization', selections: [{ fragmentSpread: 'OrgFanout' }] },
        { alias: 'shardC', name: 'organization', selections: [{ fragmentSpread: 'OrgFanout' }] },
        { alias: 'shardD', name: 'organization', selections: [{ fragmentSpread: 'OrgFanout' }] },
      ],
    },
    fragments: {
      OrgFanout: {
        name: 'OrgFanout',
        typeCondition: 'Organization',
        selections: [
          {
            name: 'teams',
            args: { first: 80 },
            selections: [
              { name: 'id' },
              {
                name: 'members',
                args: { limit: 50 },
                selections: [{ name: 'id' }, { name: 'role' }],
              },
            ],
          },
        ],
      },
    },
  };
}

export function buildBenignPaginatedAST(): {
  query: QueryAST;
  fragments: FragmentMap;
} {
  return {
    query: {
      selections: [
        {
          name: 'workspace',
          selections: [
            { name: 'id' },
            {
              name: 'projects',
              args: { first: 5 },
              selections: [
                { name: 'name' },
                {
                  name: 'tasks',
                  args: { limit: 8 },
                  selections: [{ name: 'id' }, { name: 'status' }],
                },
              ],
            },
          ],
        },
      ],
    },
    fragments: {},
  };
}

const benignAst = buildBenignAST();
const aliasAst = { query: aliasAmplificationAttack(400, 200), fragments: {} };
const deepFragAst = buildDeepFragments(10);
const listExplosionAst = buildListExplosionAST(10000);
const combinedStormAst = buildCombinedStormAST();
const benignPaginatedAst = buildBenignPaginatedAST();

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'benign-profile',
    title: 'Benign User Profile',
    shortLabel: 'Benign Profile',
    category: 'benign',
    flawTag: 'BASELINE NORMAL',
    summary:
      'Normal authenticated profile query (depth 3, first: 5). Both Naive and Hardened allow it within budget.',
    expectedNaive: 'ALLOW',
    expectedHardened: 'ALLOW',
    graphql: formatShieldASTToGraphQL(
      benignAst.query,
      benignAst.fragments,
      'BenignUserProfile'
    ),
    ast: benignAst,
  },
  {
    id: 'flaw1-alias-amplification',
    title: 'Flaw 1: 400× Alias Amplification',
    shortLabel: '400× Alias Attack',
    category: 'attack',
    flawTag: 'FLAW 1 · BREADTH BYPASS',
    summary:
      '400 aliases of `users(first: 200)` stay at depth 2 (<= 6), bypassing Naive depth limit while requesting 80,000 items.',
    expectedNaive: 'ALLOW',
    expectedHardened: 'BLOCK',
    graphql: formatShieldASTToGraphQL(
      aliasAst.query,
      aliasAst.fragments,
      'AliasAmplification400x200'
    ),
    ast: aliasAst,
  },
  {
    id: 'flaw2-fragment-hidden-depth',
    title: 'Flaw 2: Fragment-Hidden Depth (10 Levels)',
    shortLabel: 'Fragment Depth 10',
    category: 'attack',
    flawTag: 'FLAW 2 · FRAGMENT BYPASS',
    summary:
      'Visible query body only holds `...Frag1` (Naive measures depth 2), hiding a 10-level recursive chain across fragments.',
    expectedNaive: 'ALLOW',
    expectedHardened: 'BLOCK',
    graphql: formatShieldASTToGraphQL(
      deepFragAst.query,
      deepFragAst.fragments,
      'FragmentHiddenDepth10'
    ),
    ast: deepFragAst,
  },
  {
    id: 'flaw3-list-arg-explosion',
    title: 'Flaw 3: List Argument Explosion (first: 10000)',
    shortLabel: 'List Arg 10000',
    category: 'attack',
    flawTag: 'FLAW 3 · UNWEIGHTED ARGS',
    summary:
      'Shallow depth-3 query requests `first: 10000` nested with `limit: 10`. Naive ignores arguments; Hardened caps at 500/node and multiplies subtree cost.',
    expectedNaive: 'ALLOW',
    expectedHardened: 'BLOCK',
    graphql: formatShieldASTToGraphQL(
      listExplosionAst.query,
      listExplosionAst.fragments,
      'UnweightedListExplosion'
    ),
    ast: listExplosionAst,
  },
  {
    id: 'flaw4-combined-storm',
    title: 'Flaw 4: Combined Fragment + Alias + List Storm',
    shortLabel: 'Combined Storm',
    category: 'attack',
    flawTag: 'MULTI-VECTOR BYPASS',
    summary:
      '4 aliases each expand `OrgFanout` containing nested `first: 80` and `limit: 50` lists (multiplier 4,000× at leaves) while staying at depth 4.',
    expectedNaive: 'ALLOW',
    expectedHardened: 'BLOCK',
    graphql: formatShieldASTToGraphQL(
      combinedStormAst.query,
      combinedStormAst.fragments,
      'CombinedAmplificationStorm'
    ),
    ast: combinedStormAst,
  },
  {
    id: 'benign-paginated',
    title: 'Benign Nested Pagination (Within Budget)',
    shortLabel: 'Benign Pagination',
    category: 'benign',
    flawTag: 'WITHIN BUDGET',
    summary:
      'Depth-4 workspace dashboard with bounded `first: 5` and `limit: 8` pagination. Demonstrates zero false-positive blocking.',
    expectedNaive: 'ALLOW',
    expectedHardened: 'ALLOW',
    graphql: formatShieldASTToGraphQL(
      benignPaginatedAst.query,
      benignPaginatedAst.fragments,
      'BenignWorkspaceDashboard'
    ),
    ast: benignPaginatedAst,
  },
];
