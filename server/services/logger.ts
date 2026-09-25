/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - Structured Logging System
 */

import fs from 'node:fs';
import path from 'node:path';
import { LogEntry } from '../../src/types/atlas.js';

class LoggerService {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private logFilePath: string;

  constructor() {
    const logDir = process.env.ATLAS_LOG_DIR || path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      try {
        fs.mkdirSync(logDir, { recursive: true });
      } catch {
        // Fallback to current directory
      }
    }
    this.logFilePath = path.join(logDir, 'atlas-connector.log');
    this.log('info', 'STARTUP', 'Atlas Connector logging service initialized', {
      logFilePath: this.logFilePath,
      nodeVersion: process.version,
      platform: process.platform,
    });
  }

  public log(
    level: LogEntry['level'],
    category: LogEntry['category'],
    message: string,
    details?: unknown
  ): LogEntry {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Console output with standard formatting
    const consoleMsg = `[${entry.timestamp}] [${level.toUpperCase()}] [${category}] ${message}`;
    if (level === 'error') {
      console.error(consoleMsg, details ? details : '');
    } else if (level === 'warn') {
      console.warn(consoleMsg, details ? details : '');
    } else {
      console.log(consoleMsg, details ? details : '');
    }

    // Append to file asynchronously
    try {
      const line = JSON.stringify(entry) + '\n';
      fs.appendFile(this.logFilePath, line, (err) => {
        if (err) {
          // File write error fallback
        }
      });
    } catch {
      // ignore
    }

    return entry;
  }

  public info(category: LogEntry['category'], message: string, details?: unknown) {
    return this.log('info', category, message, details);
  }

  public warn(category: LogEntry['category'], message: string, details?: unknown) {
    return this.log('warn', category, message, details);
  }

  public error(category: LogEntry['category'], message: string, details?: unknown) {
    return this.log('error', category, message, details);
  }

  public debug(category: LogEntry['category'], message: string, details?: unknown) {
    return this.log('debug', category, message, details);
  }

  public getLogs(limit = 200, level?: string, category?: string): LogEntry[] {
    let filtered = this.logs;
    if (level && level !== 'all') {
      filtered = filtered.filter((l) => l.level === level);
    }
    if (category && category !== 'all') {
      filtered = filtered.filter((l) => l.category === category);
    }
    return filtered.slice(0, limit);
  }

  public clearLogs() {
    this.logs = [];
    try {
      if (fs.existsSync(this.logFilePath)) {
        fs.writeFileSync(this.logFilePath, '');
      }
    } catch {
      // ignore
    }
    this.info('CONFIG', 'Log buffer cleared by user');
  }

  public getLogFilePath(): string {
    return this.logFilePath;
  }
}

export const logger = new LoggerService();
