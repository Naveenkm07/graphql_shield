# Adaptive GraphQL Query-Cost Shield (Frontend MVP)

> **AI-Augmented Adaptive GraphQL Query-Cost Shield Against Nested-Query Denial-of-Service Attacks**  
> Frontend-only interactive engineering console built directly from [AAT2_GraphQL_Shield_Report.pdf](./AAT2_GraphQL_Shield_Report.pdf) (`Full Stack Technologies – 22CSE71`, New Horizon College of Engineering).

## Overview

Unlike REST, a GraphQL API exposes a single endpoint whose true execution cost depends entirely on the shape of the client query. Naive depth-only limiters generated as a first AI draft miss four critical attack vectors:

1. **Flaw 1 — Breadth / Alias Amplification Bypass**: 400 aliases of `users(first: 200)` stay shallow (depth 2) while fetching `80,000` items.
2. **Flaw 2 — Fragment-Hidden Depth**: Treating `...FragSpread` as a single leaf hides 10+ levels of nesting inside fragment definitions.
3. **Flaw 3 — Unweighted List Arguments**: Ignoring `first` / `limit` prices `first: 1` and `first: 10000` identically.
4. **Flaw 4 — Late Rejection**: Checking limits only during execution wastes resolver CPU before rejecting.

This pure frontend MVP compiles real GraphQL queries (via `graphql/language`) and raw JSON ASTs in the browser, executing both the **AI Baseline (`naiveGuard`)** and the **5-Stage Student-Engineered Shield (`hardenedGuard`)** side by side with zero backend required.

## Implemented MVP Workspaces

- **Attack Lab & AST Visualizer**
  - Editable **GraphQL Query Editor** and **Report AST JSON** toggle with live syntax parsing.
  - One-click scenario presets (`Benign User Profile`, `400× Alias Amplification`, `10-Level Fragment-Hidden Depth`, `List Arg 10000 Explosion`, `Combined Storm`, `Benign Pagination`) plus quick attack mutators (`+50 Aliases`, `Wrap +3 Levels in Fragment`, `Set first: 10000`).
  - Side-by-side `naiveGuard()` vs `hardenedGuard()` verdict telemetry, bypass alert detection, **Five-Stage Hardened Shield Pipeline (Figure 7.1)** status cards, and an interactive **Expanded AST & Cost Attribution Tree** showing per-node `ownCost = weight × multiplier`.
- **Automated Security Test Harness (`testHarness.js`)**
  - Live in-browser execution of all **6 canonical assertions** from Figure 8.2 plus **6 extended adversarial & edge-case tests** (including circular-fragment cycle protection).
  - Click any test to inspect assertions or open its payload directly in the Attack Lab.
- **50-Request Comparative Benchmark (`benchmark.js`)**
  - **Report Baseline Mode**: Reproduces Figure 8.1 and Figure 8.3 (`50` mixed requests, `50/50` Naive allowed vs `10/50` Hardened blocked, `863.4 ms → 5.1 ms` wall-clock).
  - **Live Browser Simulation Mode**: Customize traffic mix and request count (`20–150`) to execute real AST guards in real time and compare log-scale latency and allowed/blocked totals.
- **Policy Studio**
  - Tune `MAX_DEPTH` (`6`), `MAX_COMPLEXITY` (`1000`), `LIST_FACTOR_CAP` (`500`), and per-field resolver weights with live regression feedback against the security suite.
- **AI Audit & Report Companion**
  - Side-by-side reference diff (`naiveGuard.js` vs `hardenedShield.js`), multi-model workflow table (Claude Sonnet, GitHub Copilot, Google Gemini), Prompt 1–3 progression, Traditional vs AI-Augmented engineering time comparison (`13.5 hrs → 3.5 hrs`, `3.9×`), and AI limitations.

## Tech Stack

- **React 19 + TypeScript + Vite 6**
- **Tailwind CSS v4** (dark/light console theme)
- **GraphQL.js (`graphql`)** for real client-side GraphQL AST parsing
- **Lucide React** for icons
- **Vitest + React Testing Library** for unit and UI integration testing

## Quick Start

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Run unit & UI tests
npm test

# Typecheck & build production bundle
npm run typecheck
npm run build
```

## Project Structure

```text
├── AAT2_GraphQL_Shield_Report.pdf   # Source technical report
├── src/
│   ├── engine/
│   │   ├── types.ts                 # AST, config, and telemetry interfaces
│   │   ├── shield.ts                # naiveGuard, expandSelections, scoreNode, hardenedGuard
│   │   ├── graphqlParser.ts         # GraphQL document & JSON AST compiler/formatter
│   │   ├── fixtures.ts              # Canonical benign & adversarial query builders
│   │   ├── testHarness.ts           # 6 canonical + 6 extended live security tests
│   │   └── benchmark.ts             # Report baseline & live mixed-traffic simulator
│   ├── data/reportData.ts           # Structured report audit, prompts, and reference code
│   └── components/                  # Interactive views & visualizations
└── vite.config.ts                   # Configured with base: './' for static/GitHub Pages hosting
```

## Author & Course Attribution

- **Student**: Naveen Kumar KM (`1NH24CS409`) · Semester/Section `7B`
- **Course**: Full Stack Technologies – `22CSE71` (AAT-2: AI-Augmented Development)
- **Institution**: New Horizon College of Engineering (Academic Year 2026–2027)
