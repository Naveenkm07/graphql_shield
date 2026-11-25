import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  BookOpen,
  FlaskConical,
  Moon,
  ShieldCheck,
  Sliders,
  Sun,
  TerminalSquare,
} from 'lucide-react';
import { AiAuditView } from './components/AiAuditView';
import { AttackLabView } from './components/AttackLabView';
import { Badge } from './components/Badge';
import { BenchmarkView } from './components/BenchmarkView';
import { PolicyStudioView } from './components/PolicyStudioView';
import { TestHarnessView } from './components/TestHarnessView';
import { REPORT_METADATA } from './data/reportData';
import { DEFAULT_SHIELD_CONFIG, ShieldConfig } from './engine/types';

type ActiveTab = 'lab' | 'harness' | 'benchmark' | 'policy' | 'audit';

const POLICY_STORAGE_KEY = 'graphql_shield_policy_v1';

function loadInitialPolicy(): ShieldConfig {
  try {
    const raw = localStorage.getItem(POLICY_STORAGE_KEY);
    if (!raw) return DEFAULT_SHIELD_CONFIG;
    const parsed = JSON.parse(raw) as Partial<ShieldConfig>;
    return {
      maxDepth:
        typeof parsed.maxDepth === 'number'
          ? parsed.maxDepth
          : DEFAULT_SHIELD_CONFIG.maxDepth,
      maxComplexity:
        typeof parsed.maxComplexity === 'number'
          ? parsed.maxComplexity
          : DEFAULT_SHIELD_CONFIG.maxComplexity,
      listFactorCap:
        typeof parsed.listFactorCap === 'number'
          ? parsed.listFactorCap
          : DEFAULT_SHIELD_CONFIG.listFactorCap,
      fieldWeights:
        parsed.fieldWeights && typeof parsed.fieldWeights === 'object'
          ? parsed.fieldWeights
          : {},
    };
  } catch {
    return DEFAULT_SHIELD_CONFIG;
  }
}

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('lab');
  const [darkMode, setDarkMode] = useState(true);
  const [config, setConfig] = useState<ShieldConfig>(loadInitialPolicy);
  const [externalPayload, setExternalPayload] = useState<{
    id: string;
    title: string;
    graphql: string;
  } | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(POLICY_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Ignore storage quota errors
    }
  }, [config]);

  const handleLoadQueryInLab = useCallback(
    (payload: { id: string; title: string; graphql: string }) => {
      setExternalPayload(payload);
      setActiveTab('lab');
    },
    []
  );

  const clearExternalPayload = useCallback(() => {
    setExternalPayload(null);
  }, []);

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: typeof FlaskConical;
  }> = [
    { id: 'lab', label: 'Attack Lab & AST', icon: FlaskConical },
    { id: 'harness', label: 'Security Harness (6/6)', icon: TerminalSquare },
    { id: 'benchmark', label: '50-Req Benchmark', icon: Activity },
    { id: 'policy', label: 'Policy Studio', icon: Sliders },
    { id: 'audit', label: 'AI Audit & Report', icon: BookOpen },
  ];

  return (
    <div className="bg-console-grid min-h-screen flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-[#070b14]/90">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-slate-900 sm:text-base dark:text-white">
                  {REPORT_METADATA.shortTitle}
                </h1>
                <Badge tone="cyan" className="hidden sm:inline-flex">
                  Frontend MVP · Client AST Engine
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                5-Stage Pre-Execution DoS Defense · {REPORT_METADATA.course}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] text-slate-700 md:flex dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <span>DEPTH ≤ {config.maxDepth}</span>
              <span className="text-slate-400">·</span>
              <span>COST ≤ {config.maxComplexity}</span>
              <span className="text-slate-400">·</span>
              <span>CAP {config.listFactorCap}</span>
            </div>

            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label="Toggle color theme"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {darkMode ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav
            aria-label="Primary sections"
            className="-mb-px flex gap-1 overflow-x-auto"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                      : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {activeTab === 'lab' && (
          <AttackLabView
            config={config}
            externalPayload={externalPayload}
            onClearExternalPayload={clearExternalPayload}
          />
        )}
        {activeTab === 'harness' && (
          <TestHarnessView
            config={config}
            onLoadQueryInLab={handleLoadQueryInLab}
          />
        )}
        {activeTab === 'benchmark' && <BenchmarkView config={config} />}
        {activeTab === 'policy' && (
          <PolicyStudioView
            config={config}
            onChange={setConfig}
            onReset={() => setConfig(DEFAULT_SHIELD_CONFIG)}
          />
        )}
        {activeTab === 'audit' && <AiAuditView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/80 py-3.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-[#070b14]/80 dark:text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 sm:px-6">
          <span>
            {REPORT_METADATA.studentName} ({REPORT_METADATA.usn}) · Sem/Sec{' '}
            {REPORT_METADATA.semesterSection} · {REPORT_METADATA.institution}
          </span>
          <span className="font-mono text-[11px]">
            Pure Frontend MVP · Real-time GraphQL AST & Cost Shield
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
