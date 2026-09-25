/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - Dual-Mode Desktop & Host Bridge Client
 */

import {
  AppSettings,
  GoSOMJob,
  InstallProgress,
  LogEntry,
  ScrapedBusiness,
  SearchQueryParams,
  SystemCheckReport,
} from '../types/atlas.js';

declare global {
  interface Window {
    atlasDesktop?: {
      isDesktop: boolean;
      diagnostics: {
        run: () => Promise<SystemCheckReport>;
      };
      installer: {
        getStatus: () => Promise<{ isInstalled: boolean; exePath: string; progress: InstallProgress }>;
        checkRelease: () => Promise<{ version: string; assetUrl: string; sha256: string; size: number }>;
        install: () => Promise<boolean>;
      };
      process: {
        getStatus: () => Promise<{ state: string; pid: number | null; port: number; isRunning: boolean }>;
        start: (port?: number, dataFolder?: string) => Promise<{ pid: number; port: number }>;
        stop: () => Promise<boolean>;
        restart: (port?: number) => Promise<boolean>;
        getStdout: () => Promise<{ lines: string[] }>;
        clearConsole: () => Promise<{ success: boolean }>;
      };
      jobs: {
        list: () => Promise<GoSOMJob[]>;
        create: (params: SearchQueryParams) => Promise<string>;
        get: (id: string) => Promise<GoSOMJob>;
        getResults: (id: string) => Promise<ScrapedBusiness[]>;
        delete: (id: string) => Promise<boolean>;
      };
      logs: {
        get: (limit?: number, level?: string, category?: string) => Promise<{ logs: LogEntry[]; filePath: string }>;
        clear: () => Promise<{ success: boolean }>;
      };
      settings: {
        get: () => Promise<AppSettings>;
        update: (partial: Partial<AppSettings>) => Promise<AppSettings>;
      };
    };
  }
}

class ApiBridge {
  public isDesktop(): boolean {
    return !!window.atlasDesktop;
  }

  // ==========================================
  // Diagnostics
  // ==========================================
  public async getDiagnostics(): Promise<SystemCheckReport> {
    if (window.atlasDesktop) {
      return await window.atlasDesktop.diagnostics.run();
    }
    const res = await fetch('/api/diagnostics');
    if (!res.ok) throw new Error(`Diagnostics request failed: ${res.statusText}`);
    return await res.json();
  }

  // ==========================================
  // Installer
  // ==========================================
  public async getInstallerStatus(): Promise<{
    isInstalled: boolean;
    exePath: string;
    progress: InstallProgress;
  }> {
    if (window.atlasDesktop) {
      return await window.atlasDesktop.installer.getStatus();
    }
    const res = await fetch('/api/installer/status');
    if (!res.ok) throw new Error(`Installer status request failed: ${res.statusText}`);
    return await res.json();
  }

  public async checkRelease(): Promise<{
    version: string;
    assetUrl: string;
    sha256: string;
    size: number;
    assetName: string;
  }> {
    if (window.atlasDesktop) {
      return (await window.atlasDesktop.installer.checkRelease()) as {
        version: string;
        assetUrl: string;
        sha256: string;
        size: number;
        assetName: string;
      };
    }
    const res = await fetch('/api/installer/check-release', { method: 'POST' });
    if (!res.ok) throw new Error(`Check release request failed: ${res.statusText}`);
    return await res.json();
  }

  public async triggerInstall(): Promise<void> {
    if (window.atlasDesktop) {
      await window.atlasDesktop.installer.install();
      return;
    }
    const res = await fetch('/api/installer/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: true }),
    });
    if (!res.ok) throw new Error(`Install request failed: ${res.statusText}`);
  }

  public async getInstallProgress(): Promise<InstallProgress> {
    const res = await fetch('/api/installer/progress');
    if (!res.ok) throw new Error('Failed to get install progress');
    return await res.json();
  }

  // ==========================================
  // Process Manager
  // ==========================================
  public async getProcessStatus(): Promise<{
    state: string;
    pid: number | null;
    port: number;
    isRunning: boolean;
  }> {
    if (window.atlasDesktop) {
      return await window.atlasDesktop.process.getStatus();
    }
    const res = await fetch('/api/process/status');
    if (!res.ok) throw new Error(`Process status request failed: ${res.statusText}`);
    return await res.json();
  }

  public async startProcess(port?: number, dataFolder?: string): Promise<{ pid: number; port: number }> {
    if (window.atlasDesktop) {
      return await window.atlasDesktop.process.start(port, dataFolder);
    }
    const res = await fetch('/api/process/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ port, dataFolder }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to start GoSOM process');
    }
    return await res.json();
  }

  public async stopProcess(): Promise<void> {
    if (window.atlasDesktop) {
      await window.atlasDesktop.process.stop();
      return;
    }
    const res = await fetch('/api/process/stop', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to stop GoSOM process');
  }

  public async restartProcess(port?: number): Promise<void> {
    if (window.atlasDesktop) {
      await window.atlasDesktop.process.restart(port);
      return;
    }
    const res = await fetch('/api/process/restart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ port }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to restart GoSOM process');
    }
  }

  public async getStdout(): Promise<{ lines: string[] }> {
    if (window.atlasDesktop) {
      return await window.atlasDesktop.process.getStdout();
    }
    const res = await fetch('/api/process/stdout');
    if (!res.ok) return { lines: [] };
    return await res.json();
  }

  public async clearConsole(): Promise<void> {
    if (window.atlasDesktop) {
      await window.atlasDesktop.process.clearConsole();
      return;
    }
    await fetch('/api/process/clear-console', { method: 'POST' });
  }

  // ==========================================
  // Discovery Jobs
  // ==========================================
  public async listJobs(): Promise<GoSOMJob[]> {
    if (window.atlasDesktop) {
      return await window.atlasDesktop.jobs.list();
    }
    const res = await fetch('/api/jobs');
    if (!res.ok) throw new Error('Failed to list jobs');
    return await res.json();
  }

  public async submitJob(params: SearchQueryParams): Promise<{ jobId: string }> {
    if (window.atlasDesktop) {
      const jobId = await window.atlasDesktop.jobs.create(params);
      return { jobId };
    }
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to submit discovery job');
    }
    return await res.json();
  }

  public async getJob(id: string): Promise<GoSOMJob> {
    if (window.atlasDesktop) {
      return await window.atlasDesktop.jobs.get(id);
    }
    const res = await fetch(`/api/jobs/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Failed to get job ${id}`);
    return await res.json();
  }

  public async getJobResults(id: string): Promise<ScrapedBusiness[]> {
    if (window.atlasDesktop) {
      return await window.atlasDesktop.jobs.getResults(id);
    }
    const res = await fetch(`/api/jobs/${encodeURIComponent(id)}/results`);
    if (!res.ok) throw new Error(`Failed to retrieve results for job ${id}`);
    return await res.json();
  }

  public async cancelJob(id: string): Promise<void> {
    if (window.atlasDesktop) {
      await window.atlasDesktop.jobs.delete(id);
      return;
    }
    await fetch(`/api/jobs/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  // ==========================================
  // Logs & Settings
  // ==========================================
  public async getLogs(
    limit = 200,
    level?: string,
    category?: string
  ): Promise<{ logs: LogEntry[]; filePath: string }> {
    if (window.atlasDesktop) {
      return await window.atlasDesktop.logs.get(limit, level, category);
    }
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (level) params.set('level', level);
    if (category) params.set('category', category);
    const res = await fetch(`/api/logs?${params.toString()}`);
    if (!res.ok) return { logs: [], filePath: '' };
    return await res.json();
  }

  public async clearLogs(): Promise<void> {
    if (window.atlasDesktop) {
      await window.atlasDesktop.logs.clear();
      return;
    }
    await fetch('/api/logs/clear', { method: 'POST' });
  }

  public async getSettings(): Promise<AppSettings> {
    if (window.atlasDesktop) {
      return await window.atlasDesktop.settings.get();
    }
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to load settings');
    return await res.json();
  }

  public async updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
    if (window.atlasDesktop) {
      return await window.atlasDesktop.settings.update(partial);
    }
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to update settings');
    }
    return await res.json();
  }
}

export const api = new ApiBridge();
