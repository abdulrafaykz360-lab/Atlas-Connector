/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - GoSOM Installation & Setup Wizard Tab
 */

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  ShieldCheck, 
  HardDrive, 
  FolderCheck, 
  Cpu, 
  Server, 
  Play, 
  RefreshCw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { InstallProgress, SystemCheckReport } from '../types/atlas.js';
import { api } from '../services/apiBridge.js';

interface SetupWizardTabProps {
  diagnostics: SystemCheckReport | null;
  onRefreshDiagnostics: () => void;
  onGoSOMStarted: () => void;
}

export const SetupWizardTab: React.FC<SetupWizardTabProps> = ({
  diagnostics,
  onRefreshDiagnostics,
  onGoSOMStarted,
}) => {
  const [step, setStep] = useState<number>(1);
  const [userConfirmed, setUserConfirmed] = useState<boolean>(false);
  const [releaseInfo, setReleaseInfo] = useState<{
    version: string;
    assetUrl: string;
    sha256: string;
    size: number;
    assetName: string;
  } | null>(null);
  const [checkingRelease, setCheckingRelease] = useState<boolean>(false);
  const [installing, setInstalling] = useState<boolean>(false);
  const [progress, setProgress] = useState<InstallProgress>({
    status: 'idle',
    percentage: 0,
    bytesDownloaded: 0,
    totalBytes: 0,
    speedBytesPerSec: 0,
    message: 'Ready',
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check release on mount
  useEffect(() => {
    fetchReleaseInfo();
  }, []);

  const fetchReleaseInfo = async () => {
    try {
      setCheckingRelease(true);
      setErrorMsg(null);
      const info = await api.checkRelease();
      setReleaseInfo(info);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Failed to query GitHub API: ${msg}`);
    } finally {
      setCheckingRelease(false);
    }
  };

  // Poll progress while installing
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (installing) {
      interval = setInterval(async () => {
        try {
          const p = await api.getInstallProgress();
          setProgress(p);
          if (p.status === 'complete') {
            setInstalling(false);
            onRefreshDiagnostics();
            setStep(4);
          } else if (p.status === 'failed') {
            setInstalling(false);
            setErrorMsg(p.error || 'Installation failed.');
          }
        } catch {
          // ignore
        }
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [installing]);

  const handleStartInstallation = async () => {
    if (!userConfirmed) return;
    try {
      setInstalling(true);
      setErrorMsg(null);
      await api.triggerInstall();
      setStep(3);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setInstalling(false);
    }
  };

  const handleLaunchEngine = async () => {
    try {
      setErrorMsg(null);
      await api.startProcess();
      onGoSOMStarted();
      setStep(5);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Failed to start GoSOM: ${msg}`);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Wizard Header */}
      <div>
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold tracking-wider uppercase mb-1">
          <ShieldCheck className="w-4 h-4" />
          Controlled Installation Wizard
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          GoSOM Discovery Engine Setup
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Install and verify the official open-source Google Maps discovery engine with full user consent.
        </p>
      </div>

      {/* Steps Breadcrumb */}
      <div className="grid grid-cols-5 gap-2 p-1.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
        {[
          { num: 1, label: '1. Overview' },
          { num: 2, label: '2. Permissions' },
          { num: 3, label: '3. Download' },
          { num: 4, label: '4. Startup' },
          { num: 5, label: '5. Ready' },
        ].map((s) => (
          <div
            key={s.num}
            className={`py-2 px-3 rounded-lg text-center font-medium transition ${
              step === s.num
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                : step > s.num
                ? 'text-emerald-400 font-semibold'
                : 'text-zinc-500'
            }`}
          >
            {s.label}
          </div>
        ))}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold">Installation Alert</div>
            <p className="text-xs text-rose-300/90">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Step 1: System Checks & GoSOM Overview */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              What is GoSOM?
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed">
              <strong>GoSOM (google-maps-scraper)</strong> is the high-performance Golang discovery engine chosen to power local business extraction for Atlas Connector.
            </p>
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2 text-xs text-zinc-400">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Official Repository:</span>
                <a
                  href="https://github.com/gosom/google-maps-scraper"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  github.com/gosom/google-maps-scraper
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Deployment Strategy:</span>
                <span className="text-zinc-200 font-mono">Standalone Binary (No Docker Required)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Architecture:</span>
                <span className="text-zinc-200 font-mono">Windows x64 / Native Executable</span>
              </div>
            </div>
          </div>

          {/* System Check Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>GoSOM Installed</span>
                <HardDrive className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-lg font-bold text-white">
                {diagnostics?.gosomInstalled ? 'Detected' : 'Not Installed'}
              </div>
              <p className="text-[11px] text-zinc-500 truncate">
                {diagnostics?.gosomPath}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Disk Space</span>
                <FolderCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-lg font-bold text-white">
                {diagnostics?.diskSpace.availableMb ? `${(diagnostics.diskSpace.availableMb / 1024).toFixed(1)} GB Free` : 'Sufficient'}
              </div>
              <p className="text-[11px] text-zinc-500">Requires ~120 MB</p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Release Version</span>
                <Cpu className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-lg font-bold text-white">
                {checkingRelease ? 'Checking...' : releaseInfo?.version || 'v1.18.1'}
              </div>
              <p className="text-[11px] text-zinc-500">Latest Official Build</p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-950/50 flex items-center gap-2"
            >
              <span>Next: Review & Permission</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Explicit User Permission & Security */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Transparent Installation & User Consent
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Per Section 8 of the Atlas Connector specification:
              <br />
              <em className="text-zinc-400">&quot;The user must always know what is being installed. Never silently install software. Never hide system modifications.&quot;</em>
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                <div className="font-semibold text-zinc-200">Exact Actions to be Performed:</div>
                <ul className="list-disc list-inside text-zinc-400 space-y-1">
                  <li>Download official release: <code className="text-cyan-300">{releaseInfo?.assetName || 'google_maps_scraper-1.18.1-windows-amd64.exe'}</code> directly from official GitHub releases.</li>
                  <li>Verify cryptographic checksum: <code className="text-cyan-300 font-mono text-[10px]">{releaseInfo?.sha256 || 'c124fab30f12e4aae25ef52f38eb2bea5422ece708b3171ca0f34be56cf7848f'}</code>.</li>
                  <li>Store binary into application directory: <code className="text-zinc-300">{diagnostics?.gosomPath}</code>.</li>
                  <li>Bind local REST API strictly to <code className="text-zinc-300">127.0.0.1:{diagnostics?.gosomApiPort || 8080}</code> (no external network exposure).</li>
                </ul>
              </div>

              <label className="flex items-start gap-3 p-4 rounded-xl bg-zinc-950 border border-cyan-500/30 hover:border-cyan-500/50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={userConfirmed}
                  onChange={(e) => setUserConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-cyan-500"
                />
                <div className="text-xs text-zinc-300 space-y-0.5">
                  <span className="font-bold text-white block">
                    I explicitly authorize Atlas Connector to download and install GoSOM locally.
                  </span>
                  <span className="text-zinc-400">
                    I understand GoSOM will run on localhost as a discovery engine managed safely by this desktop application.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-sm"
            >
              Back
            </button>
            <button
              onClick={handleStartInstallation}
              disabled={!userConfirmed || installing}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-40 text-white font-semibold text-sm shadow-lg shadow-emerald-950/50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Approve & Install Official GoSOM</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Downloading & Verifying */}
      {step === 3 && (
        <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-6">
          <div className="text-center space-y-2">
            <Download className="w-10 h-10 text-cyan-400 mx-auto animate-bounce" />
            <h3 className="text-lg font-bold text-white">Installing Official GoSOM Release</h3>
            <p className="text-xs text-zinc-400">{progress.message}</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-zinc-400 font-mono">
              <span>{progress.status.toUpperCase()}</span>
              <span>{progress.percentage}%</span>
            </div>
            <div className="h-2.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
              <span>
                {progress.totalBytes > 0
                  ? `${(progress.bytesDownloaded / (1024 * 1024)).toFixed(1)} / ${(progress.totalBytes / (1024 * 1024)).toFixed(1)} MB`
                  : 'Downloading...'}
              </span>
              <span>
                {progress.speedBytesPerSec > 0
                  ? `${(progress.speedBytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
                  : ''}
              </span>
            </div>
          </div>

          {progress.status === 'verifying' && (
            <div className="p-3 rounded-lg bg-zinc-950 border border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Verifying SHA-256 cryptographic checksum against GitHub release asset...</span>
            </div>
          )}

          {progress.status === 'complete' && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>GoSOM binary installed and verified successfully.</span>
            </div>
          )}

          {progress.status === 'complete' && (
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep(4)}
                className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg"
              >
                <span>Continue to Engine Startup</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Engine Startup & Health Check */}
      {step === 4 && (
        <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-emerald-400" />
              Start & Health-Check Local Engine
            </h3>
            <p className="text-sm text-zinc-400">
              Atlas Connector will now start the GoSOM process with fixed arguments and verify that the REST API answers on 127.0.0.1:{diagnostics?.gosomApiPort || 8080}.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-300 space-y-1">
            <div className="text-zinc-500">Command to execute:</div>
            <div className="text-emerald-400 font-bold">
              {diagnostics?.gosomPath} -web -addr 127.0.0.1:{diagnostics?.gosomApiPort || 8080} -data-folder webdata
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={handleLaunchEngine}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-950/50 flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start GoSOM Engine & Check Health</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Ready */}
      {step === 5 && (
        <div className="p-8 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-xl">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-white">GoSOM Discovery Engine is Ready!</h3>
          <p className="text-sm text-zinc-300 max-w-md mx-auto">
            The local GoSOM REST API is active and verified healthy. You are now ready to run real business discovery tests.
          </p>
          <div className="pt-4 flex justify-center gap-4">
            <button
              onClick={onGoSOMStarted}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-cyan-950/50"
            >
              Go to Test Search
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
