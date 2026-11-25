import {
  ArgumentNode,
  DocumentNode,
  FragmentDefinitionNode as GqlFragmentDef,
  Kind,
  OperationDefinitionNode,
  SelectionNode as GqlSelectionNode,
  ValueNode,
  parse,
} from 'graphql';
import {
  FragmentMap,
  QueryAST,
  SelectionArgs,
  SelectionNode,
} from './types';

export interface ParseGraphQLResult {
  ok: true;
  query: QueryAST;
  fragments: FragmentMap;
  operationName?: string;
}

export interface ParseGraphQLError {
  ok: false;
  error: string;
  line?: number;
  column?: number;
}

export type ParseOutcome = ParseGraphQLResult | ParseGraphQLError;

function extractNumericValue(valueNode: ValueNode): number | undefined {
  if (valueNode.kind === Kind.INT) {
    const parsed = Number.parseInt(valueNode.value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (valueNode.kind === Kind.FLOAT) {
    const parsed = Number.parseFloat(valueNode.value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function extractSelectionArgs(
  argNodes: readonly ArgumentNode[] | undefined
): SelectionArgs | undefined {
  if (!argNodes || argNodes.length === 0) return undefined;
  const out: SelectionArgs = {};
  for (const arg of argNodes) {
    const num = extractNumericValue(arg.value);
    if (num !== undefined) {
      out[arg.name.value] = num;
    } else if (arg.value.kind === Kind.STRING) {
      out[arg.name.value] = arg.value.value;
    } else if (arg.value.kind === Kind.BOOLEAN) {
      out[arg.name.value] = arg.value.value;
    } else if (arg.value.kind === Kind.VARIABLE) {
      out[arg.name.value] = `$${arg.value.name.value}`;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function convertSelectionSet(
  selections: readonly GqlSelectionNode[],
  inheritedInlineType?: string
): SelectionNode[] {
  const result: SelectionNode[] = [];
  for (const sel of selections) {
    if (sel.kind === Kind.FIELD) {
      const node: SelectionNode = {
        name: sel.name.value,
      };
      if (sel.alias) {
        node.alias = sel.alias.value;
      }
      if (inheritedInlineType) {
        node.inlineFragmentType = inheritedInlineType;
      }
      const args = extractSelectionArgs(sel.arguments);
      if (args) {
        node.args = args;
      }
      if (sel.selectionSet && sel.selectionSet.selections.length > 0) {
        node.selections = convertSelectionSet(sel.selectionSet.selections);
      }
      result.push(node);
    } else if (sel.kind === Kind.FRAGMENT_SPREAD) {
      result.push({
        fragmentSpread: sel.name.value,
        ...(inheritedInlineType ? { inlineFragmentType: inheritedInlineType } : {}),
      });
    } else if (sel.kind === Kind.INLINE_FRAGMENT) {
      const typeCond = sel.typeCondition?.name.value ?? 'Inline';
      const nested = convertSelectionSet(
        sel.selectionSet.selections,
        typeCond
      );
      result.push(...nested);
    }
  }
  return result;
}

/**
 * Parses a GraphQL query document into the exact `{ query, fragments }`
 * AST representation expected by `naiveGuard` and `hardenedGuard`.
 */
export function parseGraphQLToShieldAST(source: string): ParseOutcome {
  const trimmed = source.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: 'Enter a GraphQL query or JSON AST payload to analyze.',
    };
  }

  let doc: DocumentNode;
  try {
    doc = parse(trimmed);
  } catch (err: unknown) {
    const gqlErr = err as {
      message?: string;
      locations?: Array<{ line: number; column: number }>;
    };
    const loc = gqlErr.locations?.[0];
    return {
      ok: false,
      error: gqlErr.message ?? 'Invalid GraphQL syntax.',
      line: loc?.line,
      column: loc?.column,
    };
  }

  const fragments: FragmentMap = {};
  let primaryOperation: OperationDefinitionNode | undefined;

  for (const def of doc.definitions) {
    if (def.kind === Kind.FRAGMENT_DEFINITION) {
      const frag = def as GqlFragmentDef;
      fragments[frag.name.value] = {
        name: frag.name.value,
        typeCondition: frag.typeCondition.name.value,
        selections: convertSelectionSet(frag.selectionSet.selections),
      };
    } else if (def.kind === Kind.OPERATION_DEFINITION && !primaryOperation) {
      primaryOperation = def;
    }
  }

  if (!primaryOperation) {
    return {
      ok: false,
      error: 'Document contains no executable query/mutation operation.',
    };
  }

  return {
    ok: true,
    query: {
      selections: convertSelectionSet(primaryOperation.selectionSet.selections),
    },
    fragments,
    operationName: primaryOperation.name?.value,
  };
}

/**
 * Parses raw JSON AST payload `{ query: { selections: [...] }, fragments?: {...} }`
 * so users can also paste synthetic AST fixtures from Section 8 of the report.
 */
export function parseJsonToShieldAST(rawJson: string): ParseOutcome {
  try {
    const parsed = JSON.parse(rawJson) as {
      query?: QueryAST;
      selections?: SelectionNode[];
      fragments?: FragmentMap;
    };
    const query: QueryAST | undefined = parsed.query
      ? parsed.query
      : Array.isArray(parsed.selections)
        ? { selections: parsed.selections }
        : undefined;

    if (!query || !Array.isArray(query.selections)) {
      return {
        ok: false,
        error:
          'JSON AST must include `query.selections` (array) or top-level `selections` array.',
      };
    }

    return {
      ok: true,
      query,
      fragments: parsed.fragments ?? {},
      operationName: 'RawASTPayload',
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error:
        err instanceof Error ? `Invalid JSON: ${err.message}` : 'Invalid JSON.',
    };
  }
}

function renderSelectionsGraphQL(
  selections: SelectionNode[],
  indent = 2
): string {
  const pad = ' '.repeat(indent);
  return selections
    .map((sel) => {
      if (sel.fragmentSpread) {
        return `${pad}...${sel.fragmentSpread}`;
      }
      const prefix = sel.alias ? `${sel.alias}: ` : '';
      const field = sel.name ?? 'field';
      const argsList = sel.args
        ? Object.entries(sel.args)
            .map(([k, v]) => `${k}: ${typeof v === 'string' && !v.startsWith('$') ? JSON.stringify(v) : v}`)
            .join(', ')
        : '';
      const argsStr = argsList ? `(${argsList})` : '';
      if (sel.selections && sel.selections.length > 0) {
        return `${pad}${prefix}${field}${argsStr} {\n${renderSelectionsGraphQL(
          sel.selections,
          indent + 2
        )}\n${pad}}`;
      }
      return `${pad}${prefix}${field}${argsStr}`;
    })
    .join('\n');
}

export function formatShieldASTToGraphQL(
  query: QueryAST,
  fragments: FragmentMap = {},
  operationName = 'GeneratedQuery'
): string {
  const queryBlock = `query ${operationName} {\n${renderSelectionsGraphQL(
    query.selections,
    2
  )}\n}`;
  const fragBlocks = Object.values(fragments).map(
    (frag) =>
      `fragment ${frag.name} on ${frag.typeCondition ?? 'Node'} {\n${renderSelectionsGraphQL(
        frag.selections,
        2
      )}\n}`
  );
  return [queryBlock, ...fragBlocks].join('\n\n');
}
