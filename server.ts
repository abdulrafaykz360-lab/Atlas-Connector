/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - Fullstack Server & Desktop Host Engine
 */

import express, { Request, Response } from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { diagnosticsService } from './server/services/diagnostics.js';
import { installerService } from './server/services/installer.js';
import { processManager } from './server/services/processManager.js';
import { gosomClient } from './server/services/gosomClient.js';
import { settingsService } from './server/services/settings.js';
import { logger } from './server/services/logger.js';
import { SearchQueryParams } from './src/types/atlas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// ============================================================================
// System Diagnostics API
// ============================================================================

app.get('/api/diagnostics', async (_req: Request, res: Response) => {
  try {
    const report = await diagnosticsService.runFullDiagnostic();
    report.gosomPid = processManager.getPid();
    report.gosomRunning = await processManager.isRunning();
    res.json(report);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('SYSTEM_CHECK', `Diagnostics API error: ${msg}`);
    res.status(500).json({ error: msg });
  }
});

// ============================================================================
// Installer API
// ============================================================================

app.get('/api/installer/status', async (_req: Request, res: Response) => {
  const isInstalled = await installerService.verifyInstallation();
  const progress = installerService.getProgress();
  const exePath = settingsService.getGoSOMExecutablePath();
  res.json({
    isInstalled,
    exePath,
    progress,
  });
});

app.post('/api/installer/check-release', async (_req: Request, res: Response) => {
  try {
    const release = await installerService.checkLatestRelease();
    res.json(release);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/installer/install', async (req: Request, res: Response) => {
  // REQUIRE EXPLICIT USER PERMISSION
  if (!req.body || req.body.confirmed !== true) {
    return res.status(400).json({
      error: 'User permission is required. Must send { confirmed: true } to proceed with installation.',
    });
  }

  // Run install asynchronously and return immediate acknowledgment
  installerService.install().catch((err) => {
    logger.error('INSTALLATION', `Background install error: ${err.message}`);
  });

  res.json({ message: 'Installation initiated with user permission.' });
});

app.get('/api/installer/progress', (_req: Request, res: Response) => {
  res.json(installerService.getProgress());
});

// ============================================================================
// Process Manager API
// ============================================================================

app.get('/api/process/status', async (_req: Request, res: Response) => {
  const isRunning = await processManager.isRunning();
  res.json({
    state: processManager.getState(),
    pid: processManager.getPid(),
    port: processManager.getPort(),
    isRunning,
  });
});

app.post('/api/process/start', async (req: Request, res: Response) => {
  try {
    const port = req.body?.port ? Number(req.body.port) : undefined;
    const dataFolder = req.body?.dataFolder ? String(req.body.dataFolder) : undefined;
    const result = await processManager.start(port, dataFolder);
    res.json({ success: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/process/stop', async (_req: Request, res: Response) => {
  try {
    await processManager.stop();
    res.json({ success: true, state: processManager.getState() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/process/restart', async (req: Request, res: Response) => {
  try {
    const port = req.body?.port ? Number(req.body.port) : undefined;
    await processManager.restart(port);
    res.json({
      success: true,
      state: processManager.getState(),
      pid: processManager.getPid(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/process/stdout', (_req: Request, res: Response) => {
  res.json({ lines: processManager.getStdoutBuffer() });
});

app.post('/api/process/clear-console', (_req: Request, res: Response) => {
  processManager.clearConsole();
  res.json({ success: true });
});

// ============================================================================
// GoSOM Jobs & Discovery API
// ============================================================================

app.get('/api/jobs', async (_req: Request, res: Response) => {
  try {
    const jobs = await gosomClient.listJobs();
    res.json(jobs);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/jobs', async (req: Request, res: Response) => {
  try {
    const { category, city, state, county, depth, fastMode, extractEmails, maxTimeSeconds, lat, lon, radius } = req.body;
    if (!category || !city || !state) {
      return res.status(400).json({ error: 'Category, City, and State are required fields.' });
    }

    const params: SearchQueryParams = {
      category: String(category),
      city: String(city),
      state: String(state),
      county: county ? String(county) : undefined,
      depth: depth ? Number(depth) : 1,
      fastMode: !!fastMode,
      extractEmails: !!extractEmails,
      maxTimeSeconds: maxTimeSeconds ? Number(maxTimeSeconds) : 300,
      lat: lat ? String(lat) : undefined,
      lon: lon ? String(lon) : undefined,
      radius: radius ? Number(radius) : undefined,
    };

    // Pre-flight check: ensure GoSOM is reachable
    const healthy = await gosomClient.healthCheck();
    if (!healthy) {
      // Try to auto-start if installed
      if (await processManager.isInstalled()) {
        logger.info('JOB_CREATE', 'GoSOM offline; attempting automatic start before job submission');
        await processManager.start();
      } else {
        return res.status(503).json({
          error: 'GoSOM discovery engine is offline. Please start GoSOM or complete setup first.',
        });
      }
    }

    const jobId = await gosomClient.createJob(params);
    res.status(201).json({ jobId, message: 'Discovery job queued successfully.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/jobs/:id', async (req: Request, res: Response) => {
  try {
    const job = await gosomClient.getJobStatus(req.params.id);
    res.json(job);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/jobs/:id/results', async (req: Request, res: Response) => {
  try {
    const results = await gosomClient.getJobResults(req.params.id);
    res.json(results);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.delete('/api/jobs/:id', async (req: Request, res: Response) => {
  try {
    const success = await gosomClient.deleteJob(req.params.id);
    res.json({ success });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ============================================================================
// Logs API
// ============================================================================

app.get('/api/logs', (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 200;
  const level = req.query.level ? String(req.query.level) : undefined;
  const category = req.query.category ? String(req.query.category) : undefined;
  res.json({
    logs: logger.getLogs(limit, level, category),
    filePath: logger.getLogFilePath(),
  });
});

app.post('/api/logs/clear', (_req: Request, res: Response) => {
  logger.clearLogs();
  res.json({ success: true });
});

// ============================================================================
// Settings API
// ============================================================================

app.get('/api/settings', (_req: Request, res: Response) => {
  res.json(settingsService.getSettings());
});

app.post('/api/settings', (req: Request, res: Response) => {
  try {
    const updated = settingsService.updateSettings(req.body);
    res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});

// ============================================================================
// Desktop Package / Windows Bundle Info
// ============================================================================

app.get('/api/bundle/info', (_req: Request, res: Response) => {
  res.json({
    appName: 'Atlas Connector',
    targetOS: 'Windows 10 / Windows 11 (x64)',
    version: '1.0.0-phase1',
    engine: 'GoSOM v1.18.1',
    electronConfigured: true,
    nsisInstallerScript: 'scripts/installer.nsi',
    windowsLauncher: 'bin/atlas-connector.bat',
  });
});

// ============================================================================
// Vite Middleware / Static Serving
// ============================================================================

async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  const server = http.createServer(app);
  server.listen(PORT, '0.0.0.0', () => {
    logger.info('STARTUP', `Atlas Connector server running on port ${PORT}`, {
      env: process.env.NODE_ENV || 'development',
      port: PORT,
      url: `http://localhost:${PORT}`,
    });
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
