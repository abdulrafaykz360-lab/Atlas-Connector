/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - GoSOM Process Manager & Real-time Console Tab
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Play, 
  Square, 
  RotateCcw, 
  Trash2, 
  ShieldCheck, 
  Cpu, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Check,
  AlertOctagon
} from 'lucide-react';
import { EngineState, SystemCheckReport } from '../types/atlas.js';
import { api } from '../services/apiBridge.js';

interface GoSOMEngineTabProps {
  engineState: EngineState;
  pid: number | null;
  port: number;
  diagnostics: SystemCheckReport | null;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  actionLoading: boolean;
}

export const GoSOMEngineTab: React.FC<GoSOMEngineTabProps> = ({
  engineState,
  pid,
  port,
  diagnostics,
  onStart,
  onStop,
  onRestart,
  actionLoading,
}) => {
  const [stdoutLines, setStdoutLines] = useState<string[]>([]);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Poll console stdout/stderr
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    const fetchConsole = async () => {
      try {
        const { lines } = await api.getStdout();
        setStdoutLines(lines);
      } catch {
        // ignore
      }
    };

    fetchConsole();
    interval = setInterval(fetchConsole, 1000);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [stdoutLines, autoScroll]);

  const handleClearConsole = async () => {
    await api.clearConsole();
    setStdoutLines([]);
  };

  const handleCopyConsole = () => {
    navigator.clipboard.writeText(stdoutLines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRunning = engineState === 'running';
  const isInstalled = diagnostics?.gosomInstalled ?? false;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <Cpu className="w-4 h-4" />
            Process Management & Diagnostics
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            GoSOM Process Orchestrator
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Supervised child process runtime with fixed argument arrays.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onStart}
            disabled={actionLoading || isRunning || !isInstalled}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-2 transition shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Start Process</span>
          </button>
          <button
            onClick={onStop}
            disabled={actionLoading || !isRunning}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-xs font-semibold flex items-center gap-2 transition"
          >
            <Square className="w-3.5 h-3.5 fill-zinc-200" />
            <span>Stop</span>
          </button>
          <button
            onClick={onRestart}
            disabled={actionLoading || !isInstalled}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-xs font-semibold flex items-center gap-2 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* Process Meta Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-mono">Status</span>
          <div className="text-base font-bold text-white flex items-center gap-2">
            {isRunning ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Running</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-zinc-500" />
                <span className="capitalize">{engineState}</span>
              </>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-mono">Process ID (PID)</span>
          <div className="text-base font-bold text-white font-mono">
            {pid ? `#${pid}` : 'Not Running'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-mono">REST API Target</span>
          <div className="text-base font-bold text-white font-mono text-xs">
            127.0.0.1:{port}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-mono">Binary Path</span>
          <div className="text-xs font-mono text-zinc-300 truncate" title={diagnostics?.gosomPath}>
            {diagnostics?.gosomPath ? diagnostics.gosomPath.split(/[/\\]/).pop() : 'Not Found'}
          </div>
        </div>
      </div>

      {/* Terminal Console */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl flex flex-col h-[480px]">
        {/* Terminal Title Bar */}
        <div className="h-11 px-4 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-zinc-300">
              GoSOM Live Process Output (stdout / stderr)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer pr-2">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-800 text-cyan-500"
              />
              <span>Auto-scroll</span>
            </label>

            <button
              onClick={handleCopyConsole}
              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
              title="Copy Output"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleClearConsole}
              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
              title="Clear Console"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Terminal Content */}
        <div
          ref={terminalRef}
          className="flex-1 p-4 font-mono text-xs text-zinc-300 overflow-y-auto space-y-1 select-text bg-[#070a10]"
        >
          {stdoutLines.length === 0 ? (
            <div className="text-zinc-600 italic py-8 text-center">
              No console output captured yet. Output will appear here when GoSOM starts or processes discovery jobs.
            </div>
          ) : (
            stdoutLines.map((line, idx) => {
              const isErr = line.includes('[ATLAS_ERROR]') || line.includes('error') || line.includes('FATAL');
              const isAtlas = line.includes('[ATLAS]');
              const isUrl = line.includes('http://');

              return (
                <div
                  key={idx}
                  className={`leading-relaxed break-all ${
                    isErr
                      ? 'text-rose-400 font-semibold'
                      : isAtlas
                      ? 'text-cyan-400'
                      : isUrl
                      ? 'text-emerald-400 font-semibold'
                      : 'text-zinc-300'
                  }`}
                >
                  {line}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Security Audit Card */}
      <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
          <div>
            <span className="font-bold text-zinc-200 block">Security Principle Enforced:</span>
            <span>All process commands use hardcoded immutable arguments. Arbitrary shell or PowerShell commands are strictly blocked.</span>
          </div>
        </div>
        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-500">
          FIXED ARGS ONLY
        </span>
      </div>
    </div>
  );
};
