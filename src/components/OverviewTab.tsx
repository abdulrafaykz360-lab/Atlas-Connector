/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - Overview Dashboard Tab
 */

import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Play, 
  Square, 
  RotateCcw, 
  Search, 
  Cpu, 
  HardDrive, 
  Activity, 
  Layers, 
  ArrowRight,
  ShieldAlert,
  Server
} from 'lucide-react';
import { EngineState, GoSOMJob, SystemCheckReport } from '../types/atlas.js';

interface OverviewTabProps {
  engineState: EngineState;
  pid: number | null;
  port: number;
  diagnostics: SystemCheckReport | null;
  recentJobs: GoSOMJob[];
  totalResultsCount: number;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onNavigateTab: (tab: any) => void;
  actionLoading: boolean;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  engineState,
  pid,
  port,
  diagnostics,
  recentJobs,
  totalResultsCount,
  onStart,
  onStop,
  onRestart,
  onNavigateTab,
  actionLoading,
}) => {
  const isInstalled = diagnostics?.gosomInstalled ?? false;
  const isRunning = engineState === 'running';

  // Overall status classification
  const getOverallStatus = () => {
    if (!isInstalled) {
      return {
        label: 'Setup Required',
        subtext: 'GoSOM discovery engine is not yet installed on this system.',
        color: 'border-amber-500/30 bg-amber-950/20 text-amber-300',
        icon: AlertTriangle,
        iconColor: 'text-amber-400',
        badge: '🟡 SETUP REQUIRED',
        actionLabel: 'Launch Setup Wizard',
        action: () => onNavigateTab('setup'),
      };
    }
    if (!isRunning) {
      return {
        label: 'GoSOM Engine Offline',
        subtext: 'GoSOM binary is installed but not currently running on localhost.',
        color: 'border-rose-500/30 bg-rose-950/20 text-rose-300',
        icon: XCircle,
        iconColor: 'text-rose-400',
        badge: '🔴 GOSOM OFFLINE',
        actionLabel: 'Start GoSOM Engine',
        action: onStart,
      };
    }
    return {
      label: 'Atlas Connector Ready',
      subtext: `GoSOM discovery engine is active on 127.0.0.1:${port} (PID ${pid}). Ready for local queries.`,
      color: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
      badge: '🟢 READY',
      actionLabel: 'Run Test Discovery',
      action: () => onNavigateTab('search'),
    };
  };

  const statusInfo = getOverallStatus();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Primary Status Banner */}
      <div className={`p-6 rounded-2xl border ${statusInfo.color} flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl`}>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/10 shrink-0">
            <StatusIcon className={`w-8 h-8 ${statusInfo.iconColor}`} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-900 border border-white/10">
                {statusInfo.badge}
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">{statusInfo.label}</h2>
            </div>
            <p className="text-sm text-zinc-300 mt-1 max-w-2xl">{statusInfo.subtext}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={statusInfo.action}
            disabled={actionLoading}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-950/50 transition disabled:opacity-50 flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{statusInfo.actionLabel}</span>
          </button>
        </div>
      </div>

      {/* Quick Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Engine Status */}
        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Process State</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight font-mono capitalize">
            {engineState}
          </div>
          <div className="text-xs text-zinc-300 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
            {isRunning ? `PID: ${pid} on port ${port}` : 'Process not running'}
          </div>
        </div>

        {/* REST API Status */}
        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>REST API Reachability</span>
            <Server className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight font-mono">
            {diagnostics?.gosomApiReachable ? 'HTTP 200' : 'Unreachable'}
          </div>
          <div className="text-xs text-zinc-300">
            Target: <code className="text-zinc-200">http://127.0.0.1:{port}</code>
          </div>
        </div>

        {/* Discovered Leads */}
        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Discovered Businesses</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight font-mono">
            {totalResultsCount}
          </div>
          <div className="text-xs text-zinc-300">
            From {recentJobs.length} local discovery jobs
          </div>
        </div>

        {/* Installed Version */}
        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>GoSOM Binary</span>
            <HardDrive className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight font-mono truncate">
            {diagnostics?.gosomVersion || (isInstalled ? 'v1.18.1' : 'Not Installed')}
          </div>
          <div className="text-xs text-zinc-300 truncate">
            {isInstalled ? 'Official GitHub Release' : 'Requires Setup'}
          </div>
        </div>
      </div>

      {/* Engine Controls Bar */}
      <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white">GoSOM Engine Lifecycle Controls</h3>
          <p className="text-xs text-zinc-400">Direct control over the local GoSOM process via fixed arguments.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onStart}
            disabled={actionLoading || isRunning || !isInstalled}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-2 transition"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Start</span>
          </button>
          <button
            onClick={onStop}
            disabled={actionLoading || !isRunning}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-xs font-semibold flex items-center gap-2 transition"
          >
            <Square className="w-3.5 h-3.5 fill-zinc-200" />
            <span>Stop</span>
          </button>
          <button
            onClick={onRestart}
            disabled={actionLoading || !isInstalled}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-xs font-semibold flex items-center gap-2 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>
          <button
            onClick={() => onNavigateTab('engine')}
            className="px-4 py-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 text-xs font-semibold flex items-center gap-2 transition"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>View Console</span>
          </button>
        </div>
      </div>

      {/* Discovery Pipeline Architecture Diagram */}
      <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Local Discovery Architecture Pipeline
            </h3>
            <p className="text-xs text-zinc-400">
              Atlas Connector Phase 1 proves the entire local engine workflow before LeadAtlas integration.
            </p>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
            Phase 1 Isolated Scope
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
          {/* Node 1: Atlas Connector */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-cyan-500/40 space-y-1 relative">
            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">Host Agent</span>
            <div className="text-sm font-bold text-white">Atlas Connector</div>
            <p className="text-xs text-zinc-300 leading-relaxed">Windows UI & process manager</p>
          </div>

          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-zinc-600" />
          </div>

          {/* Node 2: Local GoSOM */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-blue-500/40 space-y-1">
            <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider">Scraper Engine</span>
            <div className="text-sm font-bold text-white">GoSOM (v1.18.1)</div>
            <p className="text-xs text-zinc-300 leading-relaxed">127.0.0.1:{port} REST API</p>
          </div>

          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-zinc-600" />
          </div>

          {/* Node 3: Real Google Maps Results */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-emerald-500/40 space-y-1">
            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">Output</span>
            <div className="text-sm font-bold text-white">Real Businesses</div>
            <p className="text-xs text-zinc-300 leading-relaxed">Verified Google Maps leads</p>
          </div>
        </div>
      </div>

      {/* Recent Jobs Preview */}
      <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Recent Discovery Jobs</h3>
            <p className="text-xs text-zinc-400">Queries executed through the local GoSOM instance.</p>
          </div>
          <button
            onClick={() => onNavigateTab('search')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" />
            <span>New Search</span>
          </button>
        </div>

        {recentJobs.length === 0 ? (
          <div className="p-8 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-center space-y-2">
            <Search className="w-8 h-8 text-zinc-600 mx-auto" />
            <div className="text-sm font-semibold text-zinc-300">No test searches submitted yet</div>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Run a test search (e.g. &quot;Churches in Clifton, New Jersey&quot;) to verify real end-to-end data retrieval.
            </p>
            <button
              onClick={() => onNavigateTab('search')}
              className="mt-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition inline-flex items-center gap-2"
            >
              <Play className="w-3 h-3 fill-white" />
              <span>Launch Test Search</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {recentJobs.slice(0, 4).map((job) => (
              <div key={job.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">{job.query}</div>
                  <div className="text-xs text-zinc-300 flex items-center gap-3 mt-0.5">
                    <span>ID: <code className="text-zinc-200">{job.id.slice(0, 8)}...</code></span>
                    <span>&bull;</span>
                    <span>{new Date(job.date).toLocaleTimeString()}</span>
                    {job.durationSeconds && (
                      <>
                        <span>&bull;</span>
                        <span>{job.durationSeconds}s</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
                      job.status === 'ok'
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                        : job.status === 'working'
                        ? 'bg-blue-950/60 text-blue-400 border-blue-800 animate-pulse'
                        : job.status === 'failed'
                        ? 'bg-rose-950/60 text-rose-400 border-rose-800'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {job.status.toUpperCase()}
                  </span>
                  {job.resultCount !== undefined && (
                    <span className="text-xs font-mono text-zinc-400">
                      {job.resultCount} results
                    </span>
                  )}
                  <button
                    onClick={() => onNavigateTab('results')}
                    className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                    title="View Results"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
