/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - Windows x64 Desktop Packaging Script
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

async function buildWindowsPackage() {
  console.log('📦 Building Atlas Connector for Windows 10/11 (x64)...');

  const rootDir = process.cwd();
  const distDir = path.join(rootDir, 'dist');
  const winOutDir = path.join(distDir, 'win-unpacked');

  // 1. Build Vite frontend
  console.log('🔨 Compiling React / Tailwind frontend...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch (err) {
    console.error('Frontend build failed', err);
  }

  // Ensure output directory exists after clean build
  if (!fs.existsSync(winOutDir)) {
    fs.mkdirSync(winOutDir, { recursive: true });
  }

  // 2. Write Windows launcher script
  const launcherBat = `@echo off
title Atlas Connector - Local Discovery Engine
echo ===================================================
echo   Atlas Connector - Windows Desktop Discovery Engine
echo ===================================================
cd /d "%~dp0"
set NODE_ENV=production
set PORT=3000
set ATLAS_LOG_DIR=%APPDATA%\\AtlasConnector\\logs
start http://localhost:3000
node server.js
pause
`;
  fs.writeFileSync(path.join(winOutDir, 'AtlasConnector.bat'), launcherBat);

  // 3. Write package manifest
  const manifest = {
    name: 'atlas-connector',
    version: '1.0.0',
    description: 'Standalone Windows desktop discovery engine for LeadAtlas',
    main: 'server.js',
    target: 'Windows 10/11 x64',
    engine: 'GoSOM v1.18.1',
    created: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(winOutDir, 'app-manifest.json'), JSON.stringify(manifest, null, 2));

  console.log('✅ Windows distribution assets staged at dist/win-unpacked');
}

buildWindowsPackage().catch(console.error);
