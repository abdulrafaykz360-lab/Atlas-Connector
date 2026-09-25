/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - Type Definitions & Architectural Interfaces
 */

// ============================================================================
// Core Data Models
// ============================================================================

export type EngineState = 'offline' | 'starting' | 'running' | 'stopping' | 'error';

export interface ScrapedBusiness {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  phone: string;
  website: string;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  reviewCount: number | null;
  googleMapsUrl: string;
  sourceId: string;
  emails?: string[];
  placeId?: string;
  raw?: Record<string, string>;
}

export interface GoSOMJob {
  id: string;
  name: string;
  date: string;
  status: 'pending' | 'working' | 'ok' | 'failed';
  query: string;
  city: string;
  state: string;
  county?: string;
  depth: number;
  fastMode: boolean;
  email: boolean;
  extraReviews: boolean;
  resultCount?: number;
  startedAt?: number;
  completedAt?: number;
  durationSeconds?: number;
  error?: string;
  results?: ScrapedBusiness[];
}

export interface SystemCheckReport {
  timestamp: string;
  platform: string;
  osRelease: string;
  osVersion: string;
  isWindows: boolean;
  windowsVersionLabel: string;
  isWindowsTargetMet: boolean;
  arch: string;
  cpuModel: string;
  cpuCores: number;
  totalMemoryMb: number;
  freeMemoryMb: number;
  usedMemoryPercent: number;
  diskSpace: {
    availableMb: number;
    totalMb: number;
    path: string;
  };
  networkConnected: boolean;
  networkLatencyMs: number | null;
  gosomInstalled: boolean;
  gosomVersion: string | null;
  gosomPath: string;
  gosomRunning: boolean;
  gosomPid: number | null;
  gosomApiReachable: boolean;
  gosomApiPort: number;
  portAvailable: boolean;
  hasWritePermissions: boolean;
  browserRuntimeStatus: {
    chromiumAvailable: boolean;
    runtimeNote: string;
  };
  overallReady: boolean;
  readinessIssues: string[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: 
    | 'STARTUP' 
    | 'SYSTEM_CHECK' 
    | 'INSTALLATION' 
    | 'PROCESS_START' 
    | 'PROCESS_STOP' 
    | 'HEALTH_CHECK' 
    | 'JOB_CREATE' 
    | 'JOB_STATUS' 
    | 'RESULTS_FETCH' 
    | 'ERROR' 
    | 'RESTART'
    | 'CONFIG';
  message: string;
  details?: unknown;
}

export interface AppSettings {
  gosomInstallDir: string;
  gosomDataDir: string;
  gosomBinaryName: string;
  apiPort: number;
  autoRestart: boolean;
  logDir: string;
  defaultDepth: number;
  defaultLang: string;
  defaultZoom: number;
  targetPlatform: 'win32-x64' | 'auto';
}

export interface InstallProgress {
  status: 'idle' | 'checking' | 'downloading' | 'verifying' | 'installing' | 'complete' | 'failed';
  percentage: number;
  bytesDownloaded: number;
  totalBytes: number;
  speedBytesPerSec: number;
  message: string;
  error?: string;
  verifiedChecksum?: boolean;
}

export interface SearchQueryParams {
  category: string;
  city: string;
  state: string;
  county?: string;
  depth?: number;
  fastMode?: boolean;
  extractEmails?: boolean;
  maxTimeSeconds?: number;
  lat?: string;
  lon?: string;
  radius?: number;
}

// ============================================================================
// Core Architectural Interfaces (Phase 1 Engine Specification)
// ============================================================================

/**
 * DesktopDiscoveryEngine: High-level orchestration contract for discovery engines.
 */
export interface DesktopDiscoveryEngine {
  initialize(): Promise<void>;
  getStatus(): Promise<EngineState>;
  start(): Promise<boolean>;
  stop(): Promise<boolean>;
  restart(): Promise<boolean>;
  executeSearch(params: SearchQueryParams): Promise<GoSOMJob>;
}

/**
 * GoSOMEngine: Low-level lifecycle and process management for the GoSOM binary.
 */
export interface GoSOMEngine {
  isInstalled(): Promise<boolean>;
  isRunning(): Promise<boolean>;
  getPid(): number | null;
  start(port: number, dataFolder: string): Promise<{ pid: number; port: number }>;
  stop(): Promise<boolean>;
  forceStop(): Promise<boolean>;
  restart(port: number, dataFolder: string): Promise<boolean>;
  checkHealth(): Promise<boolean>;
}

/**
 * LocalJobManager: Manages submitting, polling, and parsing local discovery jobs.
 */
export interface LocalJobManager {
  createJob(params: SearchQueryParams): Promise<string>;
  getJobStatus(jobId: string): Promise<GoSOMJob>;
  listJobs(): Promise<GoSOMJob[]>;
  getJobResults(jobId: string): Promise<ScrapedBusiness[]>;
  cancelJob(jobId: string): Promise<boolean>;
}

/**
 * GoSOMClient: HTTP REST client interacting with the GoSOM REST API on 127.0.0.1.
 */
export interface GoSOMClient {
  healthCheck(): Promise<boolean>;
  postJob(payload: Record<string, unknown>): Promise<{ id: string }>;
  fetchJob(jobId: string): Promise<Record<string, unknown>>;
  fetchResultsCsv(jobId: string): Promise<string>;
  deleteJob(jobId: string): Promise<boolean>;
}

/**
 * SystemDiagnostics: Probing system hardware, OS version, ports, and dependencies.
 */
export interface SystemDiagnostics {
  runFullDiagnostic(): Promise<SystemCheckReport>;
  checkPort(port: number): Promise<boolean>;
  checkGoSOMVersion(executablePath: string): Promise<string | null>;
}

/**
 * InstallerManager: Handles downloading official GoSOM binary, verifying SHA-256,
 * and installing safely with user permission.
 */
export interface InstallerManager {
  checkLatestRelease(): Promise<{ version: string; assetUrl: string; sha256: string; size: number }>;
  install(onProgress?: (progress: InstallProgress) => void): Promise<boolean>;
  verifyInstallation(): Promise<boolean>;
}

// ============================================================================
// Future Architecture Placeholders (Section 19 of Specification)
// DO NOT IMPLEMENT NOW. Defined as interfaces only for future extensibility.
// ============================================================================

export interface LeadAtlasConnection {
  /** Placeholder for future authenticated connection to LeadAtlas cloud service */
  connect(token: string): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

export interface RemoteJobReceiver {
  /** Placeholder for receiving remote structured queries from LeadAtlas */
  onJobReceived(callback: (job: unknown) => void): void;
}

export interface AuthenticatedConnection {
  /** Placeholder for future TLS client certs / signed tokens */
  verifySession(): Promise<boolean>;
}

export interface ResultUploader {
  /** Placeholder for pushing discovered leads to LeadAtlas */
  uploadResults(jobId: string, leads: ScrapedBusiness[]): Promise<boolean>;
}
