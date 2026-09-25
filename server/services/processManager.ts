/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - GoSOM Process Manager
 */

import { ChildProcess, spawn, execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { EngineState, GoSOMEngine } from '../../src/types/atlas.js';
import { settingsService } from './settings.js';
import { diagnosticsService } from './diagnostics.js';
import { logger } from './logger.js';

export class GoSOMProcessManager implements GoSOMEngine {
  private process: ChildProcess | null = null;
  private pid: number | null = null;
  private state: EngineState = 'offline';
  private activePort: number = 8080;
  private stdoutBuffer: string[] = [];
  private maxBufferLines = 500;
  private autoRestartEnabled = true;
  private restartAttempts = 0;
  private maxRestartAttempts = 3;
  private isIntentionalStop = false;

  constructor() {
    const settings = settingsService.getSettings();
    this.activePort = settings.apiPort;
    this.autoRestartEnabled = settings.autoRestart;
  }

  public getState(): EngineState {
    return this.state;
  }

  public getPid(): number | null {
    return this.pid;
  }

  public getPort(): number {
    return this.activePort;
  }

  public getStdoutBuffer(): string[] {
    return [...this.stdoutBuffer];
  }

  public async isInstalled(): Promise<boolean> {
    const exePath = settingsService.getGoSOMExecutablePath();
    return fs.existsSync(exePath);
  }

  public async isRunning(): Promise<boolean> {
    if (!this.process || !this.pid) {
      // Check if another GoSOM process is listening on the port
      return diagnosticsService.checkApiReachable(this.activePort);
    }
    return this.state === 'running';
  }

  /**
   * Start GoSOM locally with strict, fixed parameter arrays.
   * SECURITY PRINCIPLE: No shell invocation, no arbitrary command string interpolation.
   */
  public async start(port?: number, dataFolder?: string): Promise<{ pid: number; port: number }> {
    if (this.state === 'running' && this.pid) {
      logger.warn('PROCESS_START', `GoSOM is already running on PID ${this.pid}`);
      return { pid: this.pid, port: this.activePort };
    }

    const settings = settingsService.getSettings();
    this.activePort = port || settings.apiPort;
    const targetDataFolder = dataFolder || settings.gosomDataDir;

    if (!fs.existsSync(targetDataFolder)) {
      fs.mkdirSync(targetDataFolder, { recursive: true });
    }

    const exePath = settingsService.getGoSOMExecutablePath();
    if (!fs.existsSync(exePath)) {
      this.state = 'error';
      const msg = `GoSOM executable not found at: ${exePath}. Please install via Setup Wizard.`;
      logger.error('PROCESS_START', msg);
      throw new Error(msg);
    }

    // Check if already running or responding
    const alreadyReachable = await diagnosticsService.checkApiReachable(this.activePort);
    if (alreadyReachable) {
      this.state = 'running';
      logger.info('PROCESS_START', `An existing GoSOM instance is already responding on port ${this.activePort}`);
      return { pid: this.pid || 0, port: this.activePort };
    }

    // Verify port is free
    const isFree = await diagnosticsService.checkPort(this.activePort);
    if (!isFree) {
      this.state = 'error';
      const msg = `Target port ${this.activePort} is occupied by another application. Please change the port in Settings.`;
      logger.error('PROCESS_START', msg);
      throw new Error(msg);
    }

    this.state = 'starting';
    this.isIntentionalStop = false;
    this.appendStdout(`[ATLAS] Launching GoSOM engine on 127.0.0.1:${this.activePort}...`);
    logger.info('PROCESS_START', 'Spawning GoSOM process with fixed arguments', {
      exePath,
      port: this.activePort,
      dataFolder: targetDataFolder,
    });

    // FIXED ARGUMENT ARRAY ONLY
    const fixedArgs = [
      '-web',
      '-addr',
      `127.0.0.1:${this.activePort}`,
      '-data-folder',
      targetDataFolder,
    ];

    try {
      this.process = spawn(exePath, fixedArgs, {
        cwd: path.dirname(exePath),
        windowsHide: true,
        env: {
          ...process.env,
          // Bind only to localhost
          PORT: String(this.activePort),
        },
      });

      this.pid = this.process.pid || null;

      if (!this.pid) {
        this.state = 'error';
        throw new Error('Failed to obtain process ID from operating system.');
      }

      this.appendStdout(`[ATLAS] Process spawned with PID ${this.pid}`);

      // Capture stdout
      this.process.stdout?.on('data', (data) => {
        const text = data.toString();
        this.appendStdout(text);
      });

      // Capture stderr
      this.process.stderr?.on('data', (data) => {
        const text = data.toString();
        this.appendStdout(text, true);
      });

      // Monitor exit
      this.process.on('close', (code, signal) => {
        this.appendStdout(`[ATLAS] GoSOM process terminated with code ${code}, signal ${signal}`);
        logger.warn('PROCESS_STOP', 'GoSOM process closed', { code, signal, pid: this.pid });
        this.handleProcessExit(code);
      });

      this.process.on('error', (err) => {
        this.state = 'error';
        this.appendStdout(`[ATLAS_ERROR] Process spawn error: ${err.message}`, true);
        logger.error('PROCESS_START', `Spawn error: ${err.message}`);
      });

      // Poll API health until healthy or timeout
      const healthy = await this.waitForHealth(15000);
      if (!healthy) {
        this.state = 'error';
        throw new Error(`GoSOM process (PID ${this.pid}) started but REST API on 127.0.0.1:${this.activePort} did not respond within timeout.`);
      }

      this.state = 'running';
      this.restartAttempts = 0;
      logger.info('PROCESS_START', `GoSOM is healthy and ready on port ${this.activePort} (PID: ${this.pid})`);
      this.appendStdout(`[ATLAS] GoSOM REST API verified healthy on 127.0.0.1:${this.activePort}`);

      return { pid: this.pid, port: this.activePort };
    } catch (err: unknown) {
      this.state = 'error';
      const msg = err instanceof Error ? err.message : String(err);
      this.appendStdout(`[ATLAS_ERROR] ${msg}`, true);
      logger.error('PROCESS_START', msg);
      throw err;
    }
  }

  /**
   * Gracefully stop the GoSOM process
   */
  public async stop(): Promise<boolean> {
    this.isIntentionalStop = true;
    if (!this.process && !this.pid) {
      this.state = 'offline';
      return true;
    }

    this.state = 'stopping';
    const targetPid = this.pid;
    this.appendStdout(`[ATLAS] Gracefully stopping GoSOM process PID ${targetPid}...`);
    logger.info('PROCESS_STOP', `Stopping GoSOM PID ${targetPid}`);

    return new Promise((resolve) => {
      let resolved = false;

      const finish = () => {
        if (!resolved) {
          resolved = true;
          this.process = null;
          this.pid = null;
          this.state = 'offline';
          this.appendStdout('[ATLAS] GoSOM engine stopped.');
          logger.info('PROCESS_STOP', 'GoSOM stopped successfully');
          resolve(true);
        }
      };

      const killTimeout = setTimeout(async () => {
        if (!resolved && targetPid) {
          logger.warn('PROCESS_STOP', 'Graceful shutdown timed out, executing forceStop');
          await this.forceStop();
          finish();
        }
      }, 3000);

      if (this.process) {
        this.process.once('close', () => {
          clearTimeout(killTimeout);
          finish();
        });

        // On Windows or POSIX, send SIGTERM/SIGINT
        try {
          if (process.platform === 'win32' && targetPid) {
            execFile('taskkill', ['/pid', String(targetPid), '/T'], () => {
              // Taskkill graceful sent
            });
          } else {
            this.process.kill('SIGINT');
          }
        } catch {
          this.process.kill();
        }
      } else {
        clearTimeout(killTimeout);
        finish();
      }
    });
  }

  /**
   * Force kill GoSOM
   */
  public async forceStop(): Promise<boolean> {
    this.isIntentionalStop = true;
    const targetPid = this.pid;
    if (!targetPid) {
      this.state = 'offline';
      return true;
    }

    logger.warn('PROCESS_STOP', `Force-killing process PID ${targetPid}`);
    this.appendStdout(`[ATLAS] Force-killing process PID ${targetPid}...`);

    return new Promise((resolve) => {
      if (process.platform === 'win32') {
        execFile('taskkill', ['/F', '/T', '/PID', String(targetPid)], () => {
          this.process = null;
          this.pid = null;
          this.state = 'offline';
          resolve(true);
        });
      } else {
        try {
          if (this.process) {
            this.process.kill('SIGKILL');
          }
        } catch {
          // ignore
        }
        this.process = null;
        this.pid = null;
        this.state = 'offline';
        resolve(true);
      }
    });
  }

  /**
   * Restart GoSOM
   */
  public async restart(port?: number, dataFolder?: string): Promise<boolean> {
    logger.info('RESTART', 'Restarting GoSOM engine');
    await this.stop();
    await new Promise((r) => setTimeout(r, 1000));
    await this.start(port, dataFolder);
    return true;
  }

  /**
   * Health check probe
   */
  public async checkHealth(): Promise<boolean> {
    return diagnosticsService.checkApiReachable(this.activePort);
  }

  private async waitForHealth(timeoutMs: number): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const ok = await this.checkHealth();
      if (ok) return true;
      await new Promise((r) => setTimeout(r, 400));
    }
    return false;
  }

  private handleProcessExit(code: number | null) {
    this.pid = null;
    this.process = null;

    if (this.isIntentionalStop) {
      this.state = 'offline';
      return;
    }

    // Unexpected exit!
    this.state = 'error';
    logger.error('PROCESS_STOP', `GoSOM crashed or exited unexpectedly with code ${code}`);

    const settings = settingsService.getSettings();
    if (settings.autoRestart && this.restartAttempts < this.maxRestartAttempts) {
      this.restartAttempts++;
      const delay = this.restartAttempts * 2000;
      this.appendStdout(`[ATLAS] Unexpected exit detected. Automatic restart attempt ${this.restartAttempts}/${this.maxRestartAttempts} in ${delay / 1000}s...`);
      logger.info('RESTART', `Triggering auto-restart attempt ${this.restartAttempts}`);

      setTimeout(() => {
        this.start().catch((err) => {
          logger.error('RESTART', `Auto-restart attempt failed: ${err.message}`);
        });
      }, delay);
    }
  }

  private appendStdout(chunk: string, isErr = false) {
    const lines = chunk.split('\n').filter((l) => l.length > 0);
    const time = new Date().toLocaleTimeString();
    lines.forEach((line) => {
      const formatted = `[${time}] ${line}`;
      this.stdoutBuffer.push(formatted);
      if (this.stdoutBuffer.length > this.maxBufferLines) {
        this.stdoutBuffer.shift();
      }
      if (isErr) {
        logger.debug('PROCESS_STOP', line);
      }
    });
  }

  public clearConsole() {
    this.stdoutBuffer = [];
  }
}

export const processManager = new GoSOMProcessManager();
