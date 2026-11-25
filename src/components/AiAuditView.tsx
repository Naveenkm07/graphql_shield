import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  FileCode2,
  MessageSquareCode,
  ShieldAlert,
} from 'lucide-react';
import {
  AI_LIMITATIONS,
  AI_TOOLS_TABLE,
  ENGINEERING_COMPARISON,
  FLAWS_AND_FIXES,
  HARDENED_SHIELD_CODE,
  NAIVE_BASELINE_CODE,
  PROMPT_EVOLUTION,
  REPORT_METADATA,
} from '../data/reportData';
import { Badge } from './Badge';

export function AiAuditView() {
  return (
    <div className="space-y-5">
      {/* Report Overview Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="cyan">{REPORT_METADATA.assessmentTitle}</Badge>
              <Badge tone="indigo">{REPORT_METADATA.course}</Badge>
            </div>
            <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
              {REPORT_METADATA.projectTitle}
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {REPORT_METADATA.institution} · {REPORT_METADATA.department} ·
              Academic Year {REPORT_METADATA.academicYear}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-950/70">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {REPORT_METADATA.studentName}
            </div>
            <div className="font-mono text-[11px] text-slate-500">
              USN: {REPORT_METADATA.usn} · Sem/Sec:{' '}
              {REPORT_METADATA.semesterSection}
            </div>
          </div>
        </div>
      </div>

      {/* Section 6: 4 Critical Flaws & Fixes Matrix */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <ShieldAlert className="h-4 w-4 text-rose-500" />
          Critical Engineering Audit: 4 AI Baseline Flaws vs Hardened Fixes
          (Sections 6 & 7)
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {FLAWS_AND_FIXES.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/60"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge tone="rose">{item.id}</Badge>
                <Badge tone="emerald">{item.fixTitle}</Badge>
              </div>
              <h4 className="mt-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                {item.title}
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {item.flawDescription}
              </p>
              <div className="mt-2.5 space-y-1 border-t border-slate-200 pt-2 text-[11px] dark:border-slate-800">
                <div className="flex items-start gap-1.5 text-rose-700 dark:text-rose-300">
                  <span className="font-semibold">Baseline:</span>
                  <span>{item.baselineBehavior}</span>
                </div>
                <div className="flex items-start gap-1.5 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <strong>Hardened:</strong> {item.hardenedBehavior}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Side-by-Side Source Implementation Diff (Sections 5 & 8.1) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <FileCode2 className="h-4 w-4 text-cyan-500" />
            Reference Implementation Comparison (`naiveGuard.js` vs
            `hardenedShield.js`)
          </h3>
          <span className="text-xs text-slate-500">
            Exact Node.js reference implementations from Sections 5 and 8.1
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-lg border border-rose-500/35 bg-[#0d1117]">
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#161b22] px-3 py-2 text-xs">
              <span className="font-mono font-semibold text-rose-300">
                naiveGuard.js (AI Baseline · Depth-Only)
              </span>
              <Badge tone="rose">Vulnerable</Badge>
            </div>
            <pre className="max-h-96 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-slate-200">
              {NAIVE_BASELINE_CODE}
            </pre>
          </div>

          <div className="overflow-hidden rounded-lg border border-emerald-500/35 bg-[#0d1117]">
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#161b22] px-3 py-2 text-xs">
              <span className="font-mono font-semibold text-emerald-300">
                hardenedShield.js (Student-Engineered · 5-Stage)
              </span>
              <Badge tone="emerald">Hardened</Badge>
            </div>
            <pre className="max-h-96 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-slate-200">
              {HARDENED_SHIELD_CODE}
            </pre>
          </div>
        </div>
      </div>

      {/* Multi-Model Workflow & Prompt Engineering Strategy */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-5 dark:border-slate-800 dark:bg-slate-900/70">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Bot className="h-4 w-4 text-indigo-500" />
            Multi-Model AI Workflow (Table 3.1)
          </h3>
          <div className="space-y-3">
            {AI_TOOLS_TABLE.map((entry) => (
              <div
                key={entry.tool}
                className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {entry.tool}
                  </span>
                  <Badge tone="indigo">{entry.role}</Badge>
                </div>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                  {entry.justification}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-7 dark:border-slate-800 dark:bg-slate-900/70">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <MessageSquareCode className="h-4 w-4 text-cyan-500" />
            Multi-Turn Prompt Engineering Progression (Section 4)
          </h3>
          <div className="space-y-3">
            {PROMPT_EVOLUTION.map((step) => (
              <div
                key={step.step}
                className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div className="flex items-center gap-2">
                  <Badge tone="cyan">{step.step}</Badge>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {step.title}
                  </span>
                </div>
                <blockquote className="mt-2 border-l-2 border-cyan-500 pl-2.5 text-xs italic text-slate-700 dark:text-slate-300">
                  &ldquo;{step.prompt}&rdquo;
                </blockquote>
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <strong className="text-slate-700 dark:text-slate-200">
                    Result:
                  </strong>{' '}
                  {step.outcome}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Engineering Efficiency Table 9.1 & Limitations (Section 10) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-7 dark:border-slate-800 dark:bg-slate-900/70">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Clock className="h-4 w-4 text-emerald-500" />
            Engineering Time: Traditional vs AI-Augmented (Table 9.1)
          </h3>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[11px] font-semibold uppercase text-slate-600 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Development Phase</th>
                  <th className="px-3 py-2 text-right">Traditional</th>
                  <th className="px-3 py-2 text-right">AI-Augmented</th>
                  <th className="px-3 py-2 text-right">Speedup</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {ENGINEERING_COMPARISON.map((row, idx) => {
                  const isTotal = idx === ENGINEERING_COMPARISON.length - 1;
                  return (
                    <tr
                      key={row.phase}
                      className={
                        isTotal
                          ? 'bg-emerald-500/8 font-bold text-slate-900 dark:text-white'
                          : ''
                      }
                    >
                      <td className="px-3 py-2">{row.phase}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {row.traditionalHours.toFixed(1)} hrs
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-cyan-600 dark:text-cyan-400">
                        {row.aiAugmentedHours.toFixed(1)} hrs
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Badge tone="emerald">{row.speedup}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-5 dark:border-slate-800 dark:bg-slate-900/70">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            AI Limitations & Responsible Co-Programming (Section 10)
          </h3>
          <div className="space-y-3">
            {AI_LIMITATIONS.map((lim) => (
              <div
                key={lim.title}
                className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3"
              >
                <div className="text-xs font-bold text-amber-900 dark:text-amber-300">
                  {lim.title}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {lim.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
