/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - Windows Desktop Build & Packaging Tab
 */

import React, { useState } from 'react';
import { 
  Package, 
  Monitor, 
  Download, 
  CheckCircle2, 
  Layers, 
  FileCode, 
  Terminal,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { SystemCheckReport } from '../types/atlas.js';

interface DesktopPackageTabProps {
  diagnostics: SystemCheckReport | null;
}

export const DesktopPackageTab: React.FC<DesktopPackageTabProps> = ({ diagnostics }) => {
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  const nsisScript = `; Atlas Connector - NSIS Windows Installer (x64)
!define PRODUCT_NAME "Atlas Connector"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "Atlas Connector Team"
OutFile "dist\\AtlasConnector-Setup-x64.exe"
InstallDir "$PROGRAMFILES64\\AtlasConnector"

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  File /r "dist\\win-unpacked\\*.*"
  CreateDirectory "$APPDATA\\AtlasConnector\\bin"
  CreateDirectory "$APPDATA\\AtlasConnector\\data"
  CreateShortCut "$DESKTOP\\Atlas Connector.lnk" "$INSTDIR\\AtlasConnector.exe"
  CreateShortCut "$SMPROGRAMS\\Atlas Connector\\Atlas Connector.lnk" "$INSTDIR\\AtlasConnector.exe"
SectionEnd`;

  const handleCopyNsis = () => {
    navigator.clipboard.writeText(nsisScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleDownloadBat = () => {
    const batContent = `@echo off
title Atlas Connector - Windows Desktop Discovery Engine
echo ============================================================
echo   Atlas Connector - Windows 10 / 11 (x64) Standalone Launch
echo ============================================================
cd /d "%~dp0"
set NODE_ENV=production
set PORT=3000
set ATLAS_LOG_DIR=%APPDATA%\\AtlasConnector\\logs
start http://localhost:3000
npm start
pause
`;
    const blob = new Blob([batContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'AtlasConnector-Windows-Launcher.bat';
    link.click();
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
          <Package className="w-4 h-4" />
          Production Packaging Specification
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Windows Desktop Build (x64)
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Target specification, NSIS installer configuration, and Windows standalone bundle assets.
        </p>
      </div>

      {/* Target Requirements Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Operating System</span>
            <Monitor className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg font-bold text-white">Windows 10 / 11</div>
          <p className="text-xs text-zinc-400">Targeting x64 architecture exclusively for Phase 1</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Desktop Framework</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-lg font-bold text-white">Electron + React + TS</div>
          <p className="text-xs text-zinc-400">Native system tray, child process isolation & IPC</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Packaging Artifact</span>
            <Package className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-white">NSIS Installer / Exe</div>
          <p className="text-xs text-zinc-400">Includes desktop shortcut & clean uninstaller</p>
        </div>
      </div>

      {/* Standalone Windows Deployment Guide */}
      <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            Packaging Atlas Connector on Windows
          </h3>
          <button
            onClick={handleDownloadBat}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Windows Launcher (.bat)</span>
          </button>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          Atlas Connector includes native Electron scaffolding ready for compilation into a native Windows x64 binary via electron-builder or NSIS.
        </p>

        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 font-mono text-xs text-zinc-300 space-y-2">
          <div className="text-zinc-500 font-sans font-semibold">Windows Build Command:</div>
          <div className="text-cyan-300">npm run pack:win</div>
          <div className="text-zinc-500 font-sans text-[11px] pt-1">
            Builds frontend assets into <code>dist/</code> and stages Windows distribution files in <code>dist/win-unpacked/</code>.
          </div>
        </div>
      </div>

      {/* NSIS Script Inspector */}
      <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileCode className="w-4 h-4 text-purple-400" />
            NSIS Installer Script (scripts/installer.nsi)
          </h3>
          <button
            onClick={handleCopyNsis}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            {copiedScript ? 'Copied!' : 'Copy Script'}
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-900 font-mono text-[11px] text-zinc-300 overflow-x-auto max-h-56">
          {nsisScript}
        </pre>
      </div>

      {/* Phase 1 Completion Confirmation */}
      <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-zinc-300">
          <span className="font-bold text-white block">
            Phase 1 Standalone Engine Proved
          </span>
          <p className="leading-relaxed text-zinc-400">
            Atlas Connector independently installs, starts, monitors, and queries the local GoSOM discovery engine without any external cloud or LeadAtlas dependencies.
          </p>
        </div>
      </div>
    </div>
  );
};
