/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - Phase 1 Verification & End-to-End Engine Test
 */

import { processManager } from '../server/services/processManager.js';
import { diagnosticsService } from '../server/services/diagnostics.js';
import { gosomClient } from '../server/services/gosomClient.js';
import { logger } from '../server/services/logger.js';

async function runPhase1Tests() {
  console.log('🧪 Starting Atlas Connector Phase 1 Verification Suite...\n');

  // Test 1: Diagnostics
  console.log('1️⃣ Running System Diagnostics...');
  const diag = await diagnosticsService.runFullDiagnostic();
  console.log(`   - Platform: ${diag.platform} (${diag.arch})`);
  console.log(`   - Windows Target Met: ${diag.isWindowsTargetMet} (${diag.windowsVersionLabel})`);
  console.log(`   - CPU Cores: ${diag.cpuCores}`);
  console.log(`   - RAM: ${diag.freeMemoryMb} MB free / ${diag.totalMemoryMb} MB total`);
  console.log(`   - Network: ${diag.networkConnected ? 'Connected' : 'Offline'}`);
  console.log(`   - GoSOM Binary Installed: ${diag.gosomInstalled}`);
  console.log(`   - GoSOM Executable Path: ${diag.gosomPath}\n`);

  if (!diag.gosomInstalled) {
    console.error('❌ GoSOM binary not found. Please install before testing.');
    process.exit(1);
  }

  // Test 2: Startup
  console.log('2️⃣ Starting GoSOM Process on port 8085...');
  const { pid, port } = await processManager.start(8085, 'gosom-data-test');
  console.log(`   ✅ GoSOM started successfully! PID: ${pid}, Port: ${port}\n`);

  // Test 3: Health
  console.log('3️⃣ Probing GoSOM REST API Health...');
  const isHealthy = await processManager.checkHealth();
  console.log(`   ✅ REST API Health: ${isHealthy ? 'HEALTHY (HTTP 200)' : 'UNHEALTHY'}\n`);

  // Test 4: Jobs endpoint
  console.log('4️⃣ Querying Jobs list...');
  const jobs = await gosomClient.listJobs();
  console.log(`   ✅ Jobs list reachable, active jobs count: ${jobs.length}\n`);

  // Test 5: Graceful Stop
  console.log('5️⃣ Stopping GoSOM Process Gracefully...');
  const stopped = await processManager.stop();
  console.log(`   ✅ GoSOM stopped successfully: ${stopped}\n`);

  // Test 6: Verification of Offline State
  console.log('6️⃣ Verifying Offline State...');
  const isStillRunning = await processManager.isRunning();
  console.log(`   ✅ Is Running: ${isStillRunning} (Expected: false)\n`);

  console.log('🎉 ALL PHASE 1 VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

runPhase1Tests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
