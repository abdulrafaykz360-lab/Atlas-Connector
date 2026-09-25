/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - Desktop Header Bar
 */

import React from 'react';
import { 
  ShieldCheck, 
  Terminal, 
  Activity, 
  RefreshCw, 
  Radio, 
  Monitor 
} from 'lucide-react';
import { EngineState, SystemCheckReport } from '../types/atlas.js';

interface HeaderProps {
  engineState: EngineState;
  pid: number | null;
  port: number;
  diagnostics: SystemCheckReport | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  engineState,
  pid,
  port,
  diagnostics,
  onRefresh,
  isRefreshing,
}) => {
  const getStatusBadge = () => {
    switch (engineState) {
      case 'running':
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>READY &bull; PID {pid || 'Local'}</span>
          </div>
        );
      case 'starting':
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-semibold">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>STARTING ENGINE...</span>
          </div>
        );
      case 'stopping':
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-semibold">
            <Activity className="w-3 h-3 animate-pulse" />
            <span>STOPPING...</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-400 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            <span>ENGINE ERROR</span>
          </div>
        );
      case 'offline':
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-zinc-500"></span>
            <span>GOSOM OFFLINE</span>
          </div>
        );
    }
  };

  return (
    <header className="h-16 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur px-6 flex items-center justify-between select-none">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-950/50 border border-cyan-400/30">
          <Terminal className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              Atlas Connector
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-400 border border-zinc-700">
                v1.0 Phase 1
              </span>
            </h1>
          </div>
          <p className="text-xs text-zinc-400">
            Windows Discovery Engine &bull; GoSOM Orchestrator
          </p>
        </div>
      </div>

      {/* Target & Status Pills */}
      <div className="flex items-center gap-3">
        {/* Security Isolation Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono text-[11px]">Strict Localhost 127.0.0.1:{port}</span>
        </div>

        {/* Windows Target Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs">
          <Monitor className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-mono text-[11px]">
            {diagnostics?.isWindows ? diagnostics.windowsVersionLabel : 'Target: Windows 10/11 x64'}
          </span>
        </div>

        {/* Engine Status */}
        {getStatusBadge()}

        {/* Refresh Diagnostics */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh Diagnostics"
          className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>
    </header>
  );
};
