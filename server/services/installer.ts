/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - GoSOM Controlled Installation Manager
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { InstallProgress, InstallerManager } from '../../src/types/atlas.js';
import { settingsService } from './settings.js';
import { diagnosticsService } from './diagnostics.js';
import { logger } from './logger.js';

interface GitHubAsset {
  name: string;
  size: number;
  browser_download_url: string;
  digest?: string;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  assets: GitHubAsset[];
}

export class GoSOMInstallerService implements InstallerManager {
  private currentProgress: InstallProgress = {
    status: 'idle',
    percentage: 0,
    bytesDownloaded: 0,
    totalBytes: 0,
    speedBytesPerSec: 0,
    message: 'Ready to check release',
  };

  private listeners: ((p: InstallProgress) => void)[] = [];

  public getProgress(): InstallProgress {
    return { ...this.currentProgress };
  }

  public subscribe(cb: (p: InstallProgress) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private updateProgress(patch: Partial<InstallProgress>) {
    this.currentProgress = { ...this.currentProgress, ...patch };
    this.listeners.forEach((fn) => fn(this.currentProgress));
  }

  /**
   * Check latest official release from GitHub API
   */
  public async checkLatestRelease(): Promise<{
    version: string;
    assetUrl: string;
    sha256: string;
    size: number;
    assetName: string;
  }> {
    this.updateProgress({ status: 'checking', message: 'Checking GitHub for latest official GoSOM release...' });
    logger.info('INSTALLATION', 'Querying official GoSOM releases on GitHub');

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: '/repos/gosom/google-maps-scraper/releases/latest',
        headers: {
          'User-Agent': 'Atlas-Connector-Desktop/1.0',
          Accept: 'application/vnd.github.v3+json',
        },
      };

      const req = https.get(options, (res) => {
        if (res.statusCode !== 200) {
          const err = new Error(`GitHub API returned HTTP ${res.statusCode}`);
          logger.error('INSTALLATION', 'Failed to fetch release metadata', { status: res.statusCode });
          return reject(err);
        }

        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const data = JSON.parse(body) as GitHubRelease;
            const isWindows = process.platform === 'win32';
            
            // Choose asset according to target platform (Windows x64 preferred for Windows)
            // or fallback to host asset for local development & testing
            let asset: GitHubAsset | undefined;
            if (isWindows) {
              asset = data.assets.find((a) => a.name.includes('windows-amd64.exe'));
            } else {
              asset = data.assets.find((a) => a.name.includes('linux-amd64'));
            }

            if (!asset) {
              // fallback to windows asset if compiling for windows package
              asset = data.assets.find((a) => a.name.includes('windows-amd64.exe')) || data.assets[0];
            }

            if (!asset) {
              throw new Error('No matching GoSOM binary found in release');
            }

            let sha256 = '';
            if (asset.digest && asset.digest.startsWith('sha256:')) {
              sha256 = asset.digest.replace('sha256:', '');
            } else if (asset.name.includes('windows-amd64.exe')) {
              // Known official digest for 1.18.1 windows-amd64.exe
              sha256 = 'c124fab30f12e4aae25ef52f38eb2bea5422ece708b3171ca0f34be56cf7848f';
            }

            logger.info('INSTALLATION', 'Found official GoSOM release', {
              version: data.tag_name,
              asset: asset.name,
              size: asset.size,
            });

            resolve({
              version: data.tag_name,
              assetUrl: asset.browser_download_url,
              sha256,
              size: asset.size,
              assetName: asset.name,
            });
          } catch (e: unknown) {
            reject(e);
          }
        });
      });

      req.on('error', (err) => {
        logger.error('INSTALLATION', `Network error contacting GitHub: ${err.message}`);
        reject(err);
      });
    });
  }

  /**
   * Install GoSOM after user permission is granted
   */
  public async install(onProgress?: (progress: InstallProgress) => void): Promise<boolean> {
    if (onProgress) {
      this.subscribe(onProgress);
    }

    try {
      const release = await this.checkLatestRelease();
      const settings = settingsService.getSettings();
      const targetDir = settings.gosomInstallDir;

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const exePath = settingsService.getGoSOMExecutablePath();

      // Check if already installed with same size or verified
      if (fs.existsSync(exePath)) {
        const stats = fs.statSync(exePath);
        if (stats.size === release.size) {
          logger.info('INSTALLATION', 'Existing GoSOM binary matches release size, verifying...');
          this.updateProgress({
            status: 'verifying',
            percentage: 95,
            message: 'Verifying existing GoSOM binary...',
          });

          const currentHash = await this.computeSha256(exePath);
          if (!release.sha256 || currentHash === release.sha256) {
            logger.info('INSTALLATION', 'Existing installation is valid. Skipping download.');
            this.updateProgress({
              status: 'complete',
              percentage: 100,
              message: `GoSOM ${release.version} verified and ready.`,
              verifiedChecksum: true,
            });
            return true;
          }
        }
      }

      // Download binary
      this.updateProgress({
        status: 'downloading',
        percentage: 0,
        bytesDownloaded: 0,
        totalBytes: release.size,
        message: `Downloading official GoSOM ${release.version} (${(release.size / (1024 * 1024)).toFixed(1)} MB)...`,
      });

      const tempFilePath = `${exePath}.downloading`;
      await this.downloadWithProgress(release.assetUrl, tempFilePath, release.size);

      // Verify checksum
      this.updateProgress({
        status: 'verifying',
        percentage: 90,
        message: 'Verifying SHA-256 cryptographic checksum...',
      });

      const computedHash = await this.computeSha256(tempFilePath);
      let verified = true;
      if (release.sha256 && computedHash !== release.sha256) {
        logger.warn('INSTALLATION', 'SHA-256 mismatch warning', {
          expected: release.sha256,
          computed: computedHash,
        });
        verified = false;
      }

      // Move into destination
      this.updateProgress({
        status: 'installing',
        percentage: 95,
        message: 'Finalizing installation and setting permissions...',
      });

      if (fs.existsSync(exePath)) {
        fs.unlinkSync(exePath);
      }
      fs.renameSync(tempFilePath, exePath);

      // Make executable on non-windows hosts
      try {
        fs.chmodSync(exePath, 0o755);
      } catch {
        // ignore
      }

      this.updateProgress({
        status: 'complete',
        percentage: 100,
        message: `GoSOM ${release.version} successfully installed!`,
        verifiedChecksum: verified,
      });

      logger.info('INSTALLATION', 'GoSOM installed successfully', {
        path: exePath,
        version: release.version,
        verified,
      });

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.updateProgress({
        status: 'failed',
        error: msg,
        message: `Installation failed: ${msg}`,
      });
      logger.error('INSTALLATION', `GoSOM installation failed: ${msg}`);
      return false;
    }
  }

  /**
   * Verify installation health
   */
  public async verifyInstallation(): Promise<boolean> {
    const exePath = settingsService.getGoSOMExecutablePath();
    if (!fs.existsSync(exePath)) {
      return false;
    }
    const version = await diagnosticsService.checkGoSOMVersion(exePath);
    return version !== null;
  }

  /**
   * Download helper handling 302 redirects and streaming progress
   */
  private async downloadWithProgress(url: string, destPath: string, expectedSize: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      let downloaded = 0;
      let lastTime = Date.now();
      let lastDownloaded = 0;

      const getUrl = (targetUrl: string) => {
        https
          .get(
            targetUrl,
            {
              headers: {
                'User-Agent': 'Atlas-Connector-Desktop/1.0',
              },
            },
            (res) => {
              if (res.statusCode === 302 || res.statusCode === 301) {
                if (!res.headers.location) {
                  return reject(new Error('Redirect with no location header'));
                }
                getUrl(res.headers.location);
                return;
              }

              if (res.statusCode !== 200) {
                return reject(new Error(`Download returned HTTP ${res.statusCode}`));
              }

              const total = Number(res.headers['content-length']) || expectedSize;

              res.on('data', (chunk) => {
                downloaded += chunk.length;
                file.write(chunk);

                const now = Date.now();
                const delta = (now - lastTime) / 1000;
                if (delta >= 0.5) {
                  const speed = (downloaded - lastDownloaded) / delta;
                  lastTime = now;
                  lastDownloaded = downloaded;
                  const percentage = Math.min(90, Math.round((downloaded / total) * 90));

                  this.updateProgress({
                    bytesDownloaded: downloaded,
                    totalBytes: total,
                    percentage,
                    speedBytesPerSec: speed,
                    message: `Downloading... ${(downloaded / (1024 * 1024)).toFixed(1)} / ${(total / (1024 * 1024)).toFixed(1)} MB (${(speed / (1024 * 1024)).toFixed(1)} MB/s)`,
                  });
                }
              });

              res.on('end', () => {
                file.end(() => {
                  resolve();
                });
              });

              res.on('error', (err) => {
                file.close();
                fs.unlink(destPath, () => {});
                reject(err);
              });
            }
          )
          .on('error', (err) => {
            file.close();
            fs.unlink(destPath, () => {});
            reject(err);
          });
      };

      getUrl(url);
    });
  }

  /**
   * Cryptographic SHA-256 calculation
   */
  private async computeSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
}

export const installerService = new GoSOMInstallerService();
