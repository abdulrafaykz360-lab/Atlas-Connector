/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - App Settings & Safe Configuration Tab
 */

import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Save, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  Server, 
  Folder
} from 'lucide-react';
import { AppSettings } from '../types/atlas.js';
import { api } from '../services/apiBridge.js';

interface SettingsTabProps {
  onSettingsUpdated: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ onSettingsUpdated }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [apiPort, setApiPort] = useState<number>(8080);
  const [autoRestart, setAutoRestart] = useState<boolean>(true);
  const [installDir, setInstallDir] = useState<string>('');
  const [dataDir, setDataDir] = useState<string>('');
  const [defaultDepth, setDefaultDepth] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const s = await api.getSettings();
      setSettings(s);
      setApiPort(s.apiPort);
      setAutoRestart(s.autoRestart);
      setInstallDir(s.gosomInstallDir);
      setDataDir(s.gosomDataDir);
      setDefaultDepth(s.defaultDepth);
    } catch {
      // ignore
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSavedSuccess(false);

    try {
      await api.updateSettings({
        apiPort: Number(apiPort),
        autoRestart,
        gosomInstallDir: installDir.trim(),
        gosomDataDir: dataDir.trim(),
        defaultDepth: Number(defaultDepth),
      });

      setSavedSuccess(true);
      onSettingsUpdated();
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
          <Sliders className="w-4 h-4" />
          Environment & Engine Settings
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Application Preferences
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Configure network ports, managed directory paths, and engine supervision.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold">Configuration Error</div>
            <p className="text-xs text-rose-300/90">{errorMsg}</p>
          </div>
        </div>
      )}

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-3">
          <Check className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Preferences saved successfully to disk.</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-6">
        <div className="space-y-4">
          {/* API Port */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              <span>GoSOM Local REST API Port</span>
            </label>
            <input
              type="number"
              min="1024"
              max="65535"
              value={apiPort}
              onChange={(e) => setApiPort(Number(e.target.value))}
              required
              className="w-full max-w-xs px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm font-mono focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-zinc-500">Default: 8080. Localhost loopback binding only.</p>
          </div>

          {/* Install Directory */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-blue-400" />
              <span>GoSOM Installation Directory</span>
            </label>
            <input
              type="text"
              value={installDir}
              onChange={(e) => setInstallDir(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm font-mono focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-zinc-500">Destination for official GoSOM binary releases.</p>
          </div>

          {/* Data Directory */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-emerald-400" />
              <span>GoSOM Scrape Output Directory</span>
            </label>
            <input
              type="text"
              value={dataDir}
              onChange={(e) => setDataDir(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm font-mono focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-zinc-500">Stores jobs.db sqlite database and output CSV files.</p>
          </div>

          {/* Auto Restart */}
          <div className="pt-2">
            <label className="flex items-start gap-3 p-4 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRestart}
                onChange={(e) => setAutoRestart(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-cyan-500"
              />
              <div className="text-xs text-zinc-300 space-y-0.5">
                <span className="font-bold text-white block">Automatic Engine Restart</span>
                <span className="text-zinc-500">
                  Automatically revive the GoSOM process if it terminates unexpectedly during scraping.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start gap-3 text-xs text-zinc-400">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block">Security Principle (Section 5 Enforcement)</span>
            <p className="mt-0.5 leading-relaxed text-zinc-400">
              Atlas Connector never permits arbitrary executable command strings or remote shell execution. All child processes run strictly through controlled argument arrays.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-md shadow-cyan-950/50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
