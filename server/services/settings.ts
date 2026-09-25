/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - App Settings Management
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AppSettings } from '../../src/types/atlas.js';
import { logger } from './logger.js';

class SettingsService {
  private configPath: string;
  private settings: AppSettings;

  constructor() {
    const isWindows = process.platform === 'win32';
    const appData = process.env.APPDATA || (isWindows 
      ? path.join(os.homedir(), 'AppData', 'Roaming')
      : path.join(os.homedir(), '.atlas-connector'));

    const baseDir = path.join(appData, 'AtlasConnector');
    if (!fs.existsSync(baseDir)) {
      try {
        fs.mkdirSync(baseDir, { recursive: true });
      } catch {
        // Fallback to local data folder
      }
    }

    this.configPath = path.join(baseDir, 'atlas-config.json');

    const defaultInstallDir = isWindows
      ? path.join(baseDir, 'bin')
      : path.join(process.cwd(), 'gosom-bin');

    const defaultDataDir = isWindows
      ? path.join(baseDir, 'data')
      : path.join(process.cwd(), 'gosom-data');

    const defaultLogDir = isWindows
      ? path.join(baseDir, 'logs')
      : path.join(process.cwd(), 'logs');

    this.settings = {
      gosomInstallDir: defaultInstallDir,
      gosomDataDir: defaultDataDir,
      gosomBinaryName: isWindows ? 'google_maps_scraper.exe' : 'google_maps_scraper',
      apiPort: 8085,
      autoRestart: true,
      logDir: defaultLogDir,
      defaultDepth: 1,
      defaultLang: 'en',
      defaultZoom: 15,
      targetPlatform: 'win32-x64',
    };

    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.settings = { ...this.settings, ...parsed };
        logger.info('CONFIG', 'Settings loaded from disk', { configPath: this.configPath });
      } else {
        this.save();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('CONFIG', `Failed to load settings file, using defaults: ${msg}`);
    }
  }

  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    // Validate port
    if (partial.apiPort !== undefined) {
      const port = Number(partial.apiPort);
      if (isNaN(port) || port < 1024 || port > 65535) {
        throw new Error('API port must be a valid port number between 1024 and 65535');
      }
      partial.apiPort = port;
    }

    // Security check: No arbitrary command fields or executable injection
    if (partial.gosomBinaryName) {
      // Must strictly be an allowed filename
      const clean = path.basename(partial.gosomBinaryName);
      if (!clean.startsWith('google_maps_scraper')) {
        throw new Error('Binary name must be google_maps_scraper or google_maps_scraper.exe');
      }
      partial.gosomBinaryName = clean;
    }

    this.settings = { ...this.settings, ...partial };
    this.save();
    logger.info('CONFIG', 'Application settings updated', partial);
    return { ...this.settings };
  }

  public getGoSOMExecutablePath(): string {
    return path.join(this.settings.gosomInstallDir, this.settings.gosomBinaryName);
  }

  private save() {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.settings, null, 2), 'utf8');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('CONFIG', `Failed to save settings: ${msg}`);
    }
  }
}

export const settingsService = new SettingsService();
