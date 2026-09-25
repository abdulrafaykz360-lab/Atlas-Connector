/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - Main Application Window
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.js';
import { Navigation, NavTab } from './components/Navigation.js';
import { OverviewTab } from './components/OverviewTab.js';
import { SetupWizardTab } from './components/SetupWizardTab.js';
import { GoSOMEngineTab } from './components/GoSOMEngineTab.js';
import { TestSearchTab } from './components/TestSearchTab.js';
import { ResultsTab } from './components/ResultsTab.js';
import { DiagnosticsTab } from './components/DiagnosticsTab.js';
import { LogsTab } from './components/LogsTab.js';
import { SettingsTab } from './components/SettingsTab.js';
import { DesktopPackageTab } from './components/DesktopPackageTab.js';
import { EngineState, GoSOMJob, SystemCheckReport } from './types/atlas.js';
import { api } from './services/apiBridge.js';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [engineState, setEngineState] = useState<EngineState>('offline');
  const [pid, setPid] = useState<number | null>(null);
  const [port, setPort] = useState<number>(8080);
  const [diagnostics, setDiagnostics] = useState<SystemCheckReport | null>(null);
  const [jobs, setJobs] = useState<GoSOMJob[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Fetch full diagnostics
  const refreshDiagnostics = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const report = await api.getDiagnostics();
      setDiagnostics(report);
      setPort(report.gosomApiPort || 8080);

      // Synchronize process state
      const proc = await api.getProcessStatus();
      setEngineState(proc.state as EngineState);
      setPid(proc.pid);
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Fetch jobs
  const refreshJobs = useCallback(async () => {
    try {
      const list = await api.listJobs();
      setJobs(list);
      if (!currentJobId && list.length > 0) {
        setCurrentJobId(list[0].id);
      }
    } catch {
      // ignore
    }
  }, [currentJobId]);

  // Initial load & interval polling
  useEffect(() => {
    refreshDiagnostics();
    refreshJobs();

    const interval = setInterval(async () => {
      try {
        const proc = await api.getProcessStatus();
        setEngineState(proc.state as EngineState);
        setPid(proc.pid);
      } catch {
        // ignore
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [refreshDiagnostics, refreshJobs]);

  // Engine Actions
  const handleStartEngine = async () => {
    try {
      setActionLoading(true);
      await api.startProcess();
      await refreshDiagnostics();
    } catch (err: unknown) {
      console.error('Failed to start engine:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopEngine = async () => {
    try {
      setActionLoading(true);
      await api.stopProcess();
      await refreshDiagnostics();
    } catch (err: unknown) {
      console.error('Failed to stop engine:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestartEngine = async () => {
    try {
      setActionLoading(true);
      await api.restartProcess();
      await refreshDiagnostics();
    } catch (err: unknown) {
      console.error('Failed to restart engine:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleJobCompleted = (job: GoSOMJob) => {
    setCurrentJobId(job.id);
    refreshJobs();
  };

  // Find active job
  const currentJob = jobs.find((j) => j.id === currentJobId) || (jobs.length > 0 ? jobs[0] : null);
  const totalResultsCount = jobs.reduce((sum, j) => sum + (j.resultCount || 0), 0);
  const needsSetup = diagnostics ? !diagnostics.gosomInstalled : false;
  const hasErrors = diagnostics ? !diagnostics.overallReady : false;

  return (
    <div className="h-screen flex flex-col bg-[#070a10] text-zinc-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-hidden">
      {/* Header */}
      <Header
        engineState={engineState}
        pid={pid}
        port={port}
        diagnostics={diagnostics}
        onRefresh={refreshDiagnostics}
        isRefreshing={isRefreshing}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Navigation
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          resultCount={totalResultsCount}
          hasErrors={hasErrors}
          needsSetup={needsSetup}
        />

        {/* Tab Viewport */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-zinc-950/40 to-[#070a10]">
          {activeTab === 'overview' && (
            <OverviewTab
              engineState={engineState}
              pid={pid}
              port={port}
              diagnostics={diagnostics}
              recentJobs={jobs}
              totalResultsCount={totalResultsCount}
              onStart={handleStartEngine}
              onStop={handleStopEngine}
              onRestart={handleRestartEngine}
              onNavigateTab={setActiveTab}
              actionLoading={actionLoading}
            />
          )}

          {activeTab === 'setup' && (
            <SetupWizardTab
              diagnostics={diagnostics}
              onRefreshDiagnostics={refreshDiagnostics}
              onGoSOMStarted={() => {
                refreshDiagnostics();
                setActiveTab('search');
              }}
            />
          )}

          {activeTab === 'engine' && (
            <GoSOMEngineTab
              engineState={engineState}
              pid={pid}
              port={port}
              diagnostics={diagnostics}
              onStart={handleStartEngine}
              onStop={handleStopEngine}
              onRestart={handleRestartEngine}
              actionLoading={actionLoading}
            />
          )}

          {activeTab === 'search' && (
            <TestSearchTab
              diagnostics={diagnostics}
              onJobCompleted={(job) => {
                handleJobCompleted(job);
                setActiveTab('results');
              }}
              onNavigateToResults={() => setActiveTab('results')}
            />
          )}

          {activeTab === 'results' && (
            <ResultsTab
              currentJob={currentJob}
              allJobs={jobs}
              onSelectJob={(id) => setCurrentJobId(id)}
            />
          )}

          {activeTab === 'diagnostics' && (
            <DiagnosticsTab
              diagnostics={diagnostics}
              onRefresh={refreshDiagnostics}
              isRefreshing={isRefreshing}
            />
          )}

          {activeTab === 'logs' && <LogsTab />}

          {activeTab === 'settings' && (
            <SettingsTab onSettingsUpdated={refreshDiagnostics} />
          )}

          {activeTab === 'package' && (
            <DesktopPackageTab diagnostics={diagnostics} />
          )}
        </main>
      </div>
    </div>
  );
}
