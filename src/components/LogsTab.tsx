/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - Structured System Logs Tab
 */

import React, { useState, useEffect } from 'react';
import { 
  ScrollText, 
  Trash2, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { LogEntry } from '../types/atlas.js';
import { api } from '../services/apiBridge.js';

export const LogsTab: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilePath, setLogFilePath] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchLogs = async () => {
    try {
      setIsRefreshing(true);
      const res = await api.getLogs(
        300,
        levelFilter === 'all' ? undefined : levelFilter,
        categoryFilter === 'all' ? undefined : categoryFilter
      );
      setLogs(res.logs);
      setLogFilePath(res.filePath);
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [levelFilter, categoryFilter]);

  const handleClearLogs = async () => {
    await api.clearLogs();
    setLogs([]);
  };

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.category}] ${l.message} ${l.details ? JSON.stringify(l.details) : ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = logs.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.message.toLowerCase().includes(q) ||
      l.category.toLowerCase().includes(q) ||
      (l.details && JSON.stringify(l.details).toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <ScrollText className="w-4 h-4" />
            Audit Trail & Event Journal
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Application Logs
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-xl">
            {logFilePath ? `Log File: ${logFilePath}` : 'In-memory and persistent disk logging.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={handleCopyLogs}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Logs</span>
          </button>
          <button
            onClick={handleClearLogs}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-cyan-500 w-52"
            />
          </div>

          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs focus:outline-none"
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="warn">Warnings</option>
            <option value="error">Errors</option>
            <option value="debug">Debug</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="STARTUP">Startup</option>
            <option value="SYSTEM_CHECK">System Check</option>
            <option value="INSTALLATION">Installation</option>
            <option value="PROCESS_START">Process Start</option>
            <option value="PROCESS_STOP">Process Stop</option>
            <option value="JOB_CREATE">Job Create</option>
            <option value="RESULTS_FETCH">Results Fetch</option>
            <option value="ERROR">Error</option>
          </select>
        </div>

        <span className="text-zinc-500 font-mono text-[11px]">
          Showing {filtered.length} entries
        </span>
      </div>

      {/* Log Entries List */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl max-h-[560px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs italic">
            No log entries match the selected filters.
          </div>
        ) : (
          <div className="divide-y divide-zinc-900 font-mono text-[11px]">
            {filtered.map((log) => {
              const isErr = log.level === 'error';
              const isWarn = log.level === 'warn';

              return (
                <div key={log.id} className="p-3 hover:bg-zinc-900/40 flex items-start gap-3 transition">
                  <span className="text-zinc-500 shrink-0 select-none">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>

                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      isErr
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : isWarn
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    {log.level.toUpperCase()}
                  </span>

                  <span className="text-cyan-400 shrink-0 font-semibold">
                    [{log.category}]
                  </span>

                  <div className="flex-1 text-zinc-300 break-all">
                    <span>{log.message}</span>
                    {log.details ? (
                      <span className="text-zinc-500 ml-2">
                        {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
