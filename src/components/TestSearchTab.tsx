/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - Test Discovery Search Tab
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Play, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Building2, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { GoSOMJob, SearchQueryParams, SystemCheckReport } from '../types/atlas.js';
import { api } from '../services/apiBridge.js';

interface TestSearchTabProps {
  diagnostics: SystemCheckReport | null;
  onJobCompleted: (job: GoSOMJob) => void;
  onNavigateToResults: () => void;
}

export const TestSearchTab: React.FC<TestSearchTabProps> = ({
  diagnostics,
  onJobCompleted,
  onNavigateToResults,
}) => {
  // Query parameters per user request section 13
  const [category, setCategory] = useState<string>('Churches');
  const [city, setCity] = useState<string>('Clifton');
  const [state, setState] = useState<string>('New Jersey');
  const [county, setCounty] = useState<string>('Passaic');
  const [depth, setDepth] = useState<number>(1);
  const [fastMode, setFastMode] = useState<boolean>(false);
  const [extractEmails, setExtractEmails] = useState<boolean>(false);

  // Search state
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<GoSOMJob | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Timer for search
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isSearching) {
      timer = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSearching]);

  // Polling GoSOM job
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    if (currentJobId && isSearching) {
      pollInterval = setInterval(async () => {
        try {
          const job = await api.getJob(currentJobId);
          setJobStatus(job);

          if (job.status === 'ok') {
            setIsSearching(false);
            onJobCompleted(job);
          } else if (job.status === 'failed') {
            setIsSearching(false);
            setErrorMessage('GoSOM job failed during execution. Check GoSOM console logs for details.');
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setErrorMessage(`Polling error: ${msg}`);
        }
      }, 1500);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [currentJobId, isSearching]);

  const handleRunSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setJobStatus(null);
    setElapsedSeconds(0);

    if (!category.trim() || !city.trim() || !state.trim()) {
      setErrorMessage('Please fill in Category, City, and State.');
      return;
    }

    // Pre-flight check
    if (!diagnostics?.gosomInstalled) {
      setErrorMessage('GoSOM is not installed. Please complete the Setup Wizard first.');
      return;
    }

    try {
      setIsSearching(true);
      const params: SearchQueryParams = {
        category: category.trim(),
        city: city.trim(),
        state: state.trim(),
        county: county.trim() || undefined,
        depth,
        fastMode,
        extractEmails,
        maxTimeSeconds: 300,
      };

      const { jobId } = await api.submitJob(params);
      setCurrentJobId(jobId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to submit job: ${msg}`);
      setIsSearching(false);
    }
  };

  const isEngineReady = diagnostics?.gosomInstalled && diagnostics?.gosomApiReachable;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Tab Header */}
      <div>
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
          <Search className="w-4 h-4" />
          Real Discovery Query Execution
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Test Google Maps Discovery
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Submit real queries to the local GoSOM instance and extract verified Google Maps businesses.
        </p>
      </div>

      {/* Engine Pre-flight Status Bar */}
      <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
        isEngineReady
          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
          : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
      }`}>
        <div className="flex items-center gap-3">
          {isEngineReady ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>
            {isEngineReady
              ? `GoSOM Discovery Engine is online on 127.0.0.1:${diagnostics?.gosomApiPort || 8080}`
              : 'GoSOM Engine is offline. Starting search will attempt to auto-launch it.'}
          </span>
        </div>
        <span className="font-mono font-semibold">
          {isEngineReady ? 'PRE-FLIGHT OK' : 'OFFLINE'}
        </span>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold">Search Warning / Error</div>
            <p className="text-xs text-rose-300/90">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Search Parameters Form */}
      <form onSubmit={handleRunSearch} className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Business Category / Keyword</span>
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Churches, Dentists, Coffee Shops"
              required
              disabled={isSearching}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-cyan-500 transition disabled:opacity-50"
            />
            <p className="text-[11px] text-zinc-500">Industry or search term</p>
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>Target City</span>
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Clifton"
              required
              disabled={isSearching}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-cyan-500 transition disabled:opacity-50"
            />
            <p className="text-[11px] text-zinc-500">Municipality or locality</p>
          </div>

          {/* State */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              State / Region
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. New Jersey"
              required
              disabled={isSearching}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-cyan-500 transition disabled:opacity-50"
            />
            <p className="text-[11px] text-zinc-500">US State or province</p>
          </div>

          {/* County */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              County (Optional)
            </label>
            <input
              type="text"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              placeholder="e.g. Passaic"
              disabled={isSearching}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-cyan-500 transition disabled:opacity-50"
            />
            <p className="text-[11px] text-zinc-500">Refines local geographic precision</p>
          </div>
        </div>

        {/* Advanced Discovery Options */}
        <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span>Scroll Depth</span>
              <span className="font-mono text-cyan-400">{depth} page</span>
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              disabled={isSearching}
              className="w-full accent-cyan-500"
            />
            <p className="text-[11px] text-zinc-500">1 depth ~ 20 results (fastest)</p>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
            <input
              type="checkbox"
              id="fastMode"
              checked={fastMode}
              onChange={(e) => setFastMode(e.target.checked)}
              disabled={isSearching}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-cyan-500"
            />
            <label htmlFor="fastMode" className="text-xs cursor-pointer select-none">
              <span className="font-bold text-white block">Fast Mode</span>
              <span className="text-zinc-500 text-[11px]">Reduced data payload</span>
            </label>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
            <input
              type="checkbox"
              id="extractEmails"
              checked={extractEmails}
              onChange={(e) => setExtractEmails(e.target.checked)}
              disabled={isSearching}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-cyan-500"
            />
            <label htmlFor="extractEmails" className="text-xs cursor-pointer select-none">
              <span className="font-bold text-white block">Extract Emails</span>
              <span className="text-zinc-500 text-[11px]">Crawls website homepages</span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex justify-between items-center">
          <div className="text-xs font-mono text-zinc-500">
            Query string: &quot;{category} in {city}, {county ? `${county}, ` : ''}{state}&quot;
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white font-semibold text-sm shadow-lg shadow-cyan-950/50 flex items-center gap-2 transition"
          >
            {isSearching ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Crawling Google Maps ({elapsedSeconds}s)...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Run Test Search</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Active Job Progress Card */}
      {currentJobId && (
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  Job ID: <code className="font-mono text-xs text-cyan-300">{currentJobId}</code>
                </div>
                <div className="text-xs text-zinc-400">
                  Elapsed Time: {elapsedSeconds}s &bull; Status: <span className="font-mono uppercase text-zinc-200">{jobStatus?.status || 'PENDING'}</span>
                </div>
              </div>
            </div>

            {jobStatus?.status === 'ok' && (
              <button
                onClick={onNavigateToResults}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-emerald-950/40"
              >
                <span>View Discovered Businesses ({jobStatus.resultCount ?? 0})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Workflow Steps Indicator */}
          <div className="grid grid-cols-4 gap-2 pt-2 text-[11px] font-mono">
            <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-center text-emerald-400 flex items-center justify-center gap-1">
              <Check className="w-3 h-3" />
              <span>1. Job Created</span>
            </div>
            <div className={`p-2 rounded-lg bg-zinc-950 border text-center flex items-center justify-center gap-1 ${
              jobStatus?.status === 'working' || jobStatus?.status === 'ok'
                ? 'border-blue-500/40 text-blue-300'
                : 'border-zinc-800 text-zinc-600'
            }`}>
              {jobStatus?.status === 'working' ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
              <span>2. Maps Scrape</span>
            </div>
            <div className={`p-2 rounded-lg bg-zinc-950 border text-center flex items-center justify-center gap-1 ${
              jobStatus?.status === 'ok'
                ? 'border-emerald-500/40 text-emerald-300'
                : 'border-zinc-800 text-zinc-600'
            }`}>
              <span>3. CSV Extraction</span>
            </div>
            <div className={`p-2 rounded-lg bg-zinc-950 border text-center flex items-center justify-center gap-1 ${
              jobStatus?.status === 'ok'
                ? 'border-emerald-500/40 text-emerald-300 font-bold'
                : 'border-zinc-800 text-zinc-600'
            }`}>
              <span>4. Results Ready</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
