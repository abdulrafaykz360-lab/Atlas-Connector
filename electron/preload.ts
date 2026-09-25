/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - Electron Preload Script
 */

import { contextBridge, ipcRenderer } from 'electron';

export interface DesktopBridge {
  isDesktop: boolean;
  diagnostics: {
    run: () => Promise<unknown>;
  };
  installer: {
    getStatus: () => Promise<unknown>;
    checkRelease: () => Promise<unknown>;
    install: () => Promise<unknown>;
  };
  process: {
    getStatus: () => Promise<unknown>;
    start: (port?: number, dataFolder?: string) => Promise<unknown>;
    stop: () => Promise<unknown>;
    restart: (port?: number) => Promise<unknown>;
    getStdout: () => Promise<{ lines: string[] }>;
    clearConsole: () => Promise<{ success: boolean }>;
  };
  jobs: {
    list: () => Promise<unknown>;
    create: (params: unknown) => Promise<unknown>;
    get: (id: string) => Promise<unknown>;
    getResults: (id: string) => Promise<unknown>;
    delete: (id: string) => Promise<unknown>;
  };
  logs: {
    get: (limit?: number, level?: string, category?: string) => Promise<unknown>;
    clear: () => Promise<{ success: boolean }>;
  };
  settings: {
    get: () => Promise<unknown>;
    update: (partial: unknown) => Promise<unknown>;
  };
}

const desktopApi: DesktopBridge = {
  isDesktop: true,
  diagnostics: {
    run: () => ipcRenderer.invoke('diagnostics:run'),
  },
  installer: {
    getStatus: () => ipcRenderer.invoke('installer:status'),
    checkRelease: () => ipcRenderer.invoke('installer:check-release'),
    install: () => ipcRenderer.invoke('installer:install'),
  },
  process: {
    getStatus: () => ipcRenderer.invoke('process:status'),
    start: (port, dataFolder) => ipcRenderer.invoke('process:start', port, dataFolder),
    stop: () => ipcRenderer.invoke('process:stop'),
    restart: (port) => ipcRenderer.invoke('process:restart', port),
    getStdout: () => ipcRenderer.invoke('process:stdout'),
    clearConsole: () => ipcRenderer.invoke('process:clear-console'),
  },
  jobs: {
    list: () => ipcRenderer.invoke('jobs:list'),
    create: (params) => ipcRenderer.invoke('jobs:create', params),
    get: (id) => ipcRenderer.invoke('jobs:get', id),
    getResults: (id) => ipcRenderer.invoke('jobs:results', id),
    delete: (id) => ipcRenderer.invoke('jobs:delete', id),
  },
  logs: {
    get: (limit, level, category) => ipcRenderer.invoke('logs:get', limit, level, category),
    clear: () => ipcRenderer.invoke('logs:clear'),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (partial) => ipcRenderer.invoke('settings:update', partial),
  },
};

contextBridge.exposeInMainWorld('atlasDesktop', desktopApi);
