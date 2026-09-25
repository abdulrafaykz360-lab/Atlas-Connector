/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - Electron Main Desktop Process (Windows First)
 */

import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } from 'electron';
import path from 'node:path';
import { diagnosticsService } from '../server/services/diagnostics.js';
import { installerService } from '../server/services/installer.js';
import { processManager } from '../server/services/processManager.js';
import { gosomClient } from '../server/services/gosomClient.js';
import { settingsService } from '../server/services/settings.js';
import { logger } from '../server/services/logger.js';
import { SearchQueryParams } from '../src/types/atlas.js';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#090d16',
    title: 'Atlas Connector',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // In production or local dev
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
  mainWindow.loadURL(devUrl);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open external web links in default system browser safely
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Use a 16x16 canvas or standard icon for tray
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('Atlas Connector - Discovery Engine');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Atlas Connector',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Engine: ' + (processManager.getState() === 'running' ? 'Running' : 'Offline'),
      enabled: false,
    },
    {
      label: 'Restart GoSOM Engine',
      click: async () => {
        await processManager.restart();
      },
    },
    { type: 'separator' },
    {
      label: 'Exit Atlas Connector',
      click: async () => {
        isQuitting = true;
        await processManager.stop();
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    logger.info('STARTUP', 'Atlas Connector desktop application starting on Windows host');
    createWindow();
    createTray();
    setupIpcHandlers();
  });
}

app.on('before-quit', async (e) => {
  if (!isQuitting) {
    e.preventDefault();
    isQuitting = true;
    try {
      await processManager.stop();
    } catch {
      // Force exit
    }
    app.exit(0);
  }
});

// Setup IPC handlers mapping to our core services
function setupIpcHandlers() {
  ipcMain.handle('diagnostics:run', async () => {
    const report = await diagnosticsService.runFullDiagnostic();
    report.gosomPid = processManager.getPid();
    report.gosomRunning = await processManager.isRunning();
    return report;
  });

  ipcMain.handle('installer:status', async () => {
    const isInstalled = await installerService.verifyInstallation();
    const progress = installerService.getProgress();
    const exePath = settingsService.getGoSOMExecutablePath();
    return { isInstalled, exePath, progress };
  });

  ipcMain.handle('installer:check-release', async () => {
    return await installerService.checkLatestRelease();
  });

  ipcMain.handle('installer:install', async () => {
    return await installerService.install();
  });

  ipcMain.handle('process:status', async () => {
    const isRunning = await processManager.isRunning();
    return {
      state: processManager.getState(),
      pid: processManager.getPid(),
      port: processManager.getPort(),
      isRunning,
    };
  });

  ipcMain.handle('process:start', async (_event, port?: number, dataFolder?: string) => {
    return await processManager.start(port, dataFolder);
  });

  ipcMain.handle('process:stop', async () => {
    return await processManager.stop();
  });

  ipcMain.handle('process:restart', async (_event, port?: number) => {
    return await processManager.restart(port);
  });

  ipcMain.handle('process:stdout', () => {
    return { lines: processManager.getStdoutBuffer() };
  });

  ipcMain.handle('process:clear-console', () => {
    processManager.clearConsole();
    return { success: true };
  });

  ipcMain.handle('jobs:list', async () => {
    return await gosomClient.listJobs();
  });

  ipcMain.handle('jobs:create', async (_event, params: SearchQueryParams) => {
    return await gosomClient.createJob(params);
  });

  ipcMain.handle('jobs:get', async (_event, id: string) => {
    return await gosomClient.getJobStatus(id);
  });

  ipcMain.handle('jobs:results', async (_event, id: string) => {
    return await gosomClient.getJobResults(id);
  });

  ipcMain.handle('jobs:delete', async (_event, id: string) => {
    return await gosomClient.deleteJob(id);
  });

  ipcMain.handle('logs:get', (_event, limit?: number, level?: string, category?: string) => {
    return {
      logs: logger.getLogs(limit, level, category),
      filePath: logger.getLogFilePath(),
    };
  });

  ipcMain.handle('logs:clear', () => {
    logger.clearLogs();
    return { success: true };
  });

  ipcMain.handle('settings:get', () => {
    return settingsService.getSettings();
  });

  ipcMain.handle('settings:update', (_event, partial) => {
    return settingsService.updateSettings(partial);
  });
}
