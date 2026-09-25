/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - Phase 1.5 Real GoSOM Discovery Verification Test Suite
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { processManager } from '../server/services/processManager.js';
import { diagnosticsService } from '../server/services/diagnostics.js';
import { gosomClient } from '../server/services/gosomClient.js';
import { settingsService } from '../server/services/settings.js';
import { GoSOMJob, ScrapedBusiness } from '../src/types/atlas.js';

interface TestResult {
  step: string;
  success: boolean;
  details: unknown;
}

const resultsSummary: TestResult[] = [];

function logSection(title: string) {
  console.log('\n' + '='.repeat(70));
  console.log(`  ${title}`);
  console.log('='.repeat(70) + '\n');
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runPhase15Verification() {
  logSection('PHASE 1.5: REAL GOSOM DISCOVERY VERIFICATION');

  const settings = settingsService.getSettings();
  const testPort = settings.apiPort || 8080;
  console.log(`Using GoSOM binary at: ${settingsService.getGoSOMExecutablePath()}`);
  console.log(`Target port: ${testPort}`);

  // =========================================================================
  // STEP 1: Verify Process Lifecycle (Start & Health)
  // =========================================================================
  logSection('STEP 1: Process Startup & Health Check');
  const startResult = await processManager.start(testPort);
  console.log(`[PASS] GoSOM started. PID: ${startResult.pid}, Port: ${startResult.port}`);
  const isHealthy = await processManager.checkHealth();
  console.log(`[PASS] Health check verified: ${isHealthy ? 'HEALTHY (HTTP 200)' : 'FAILED'}`);

  resultsSummary.push({
    step: 'Process Startup & Health Check',
    success: isHealthy,
    details: { pid: startResult.pid, port: startResult.port, healthy: isHealthy },
  });

  if (!isHealthy) {
    throw new Error('GoSOM REST API failed to respond.');
  }

  // =========================================================================
  // STEP 2: Real Discovery Job 1 - "Churches in Clifton, New Jersey"
  // =========================================================================
  logSection('STEP 2: Real Discovery Job 1 - "Churches in Clifton, New Jersey"');
  const query1 = {
    category: 'Churches',
    city: 'Clifton',
    state: 'New Jersey',
    depth: 1,
    fastMode: false,
    extractEmails: false,
    maxTimeSeconds: 300,
  };

  const t0_job1 = Date.now();
  console.log('Submitting discovery query 1 to GoSOM API...');
  const jobId1 = await gosomClient.createJob(query1);
  console.log(`[PASS] Job 1 submitted. Received Job ID: ${jobId1}`);

  console.log('Polling Job 1 until terminal state...');
  let job1: GoSOMJob = await gosomClient.getJobStatus(jobId1);
  let pollCount1 = 0;

  while (job1.status === 'pending' || job1.status === 'working') {
    pollCount1++;
    await sleep(3000);
    job1 = await gosomClient.getJobStatus(jobId1);
    const elapsed = Math.round((Date.now() - t0_job1) / 1000);
    console.log(`   [${elapsed}s] Poll #${pollCount1} - State: ${job1.status.toUpperCase()}`);
    if (elapsed > 320) {
      console.error('Job 1 exceeded max timeout of 320s');
      break;
    }
  }

  const duration1 = Math.round((Date.now() - t0_job1) / 1000);
  console.log(`Job 1 finished with status: ${job1.status.toUpperCase()} in ${duration1}s`);

  // Retrieve results
  let businesses1: ScrapedBusiness[] = [];
  if (job1.status === 'ok') {
    businesses1 = await gosomClient.getJobResults(jobId1);
    console.log(`\n🎉 Successfully retrieved ${businesses1.length} businesses from Google Maps!`);
  } else {
    console.error(`Job 1 failed with status: ${job1.status}`);
  }

  resultsSummary.push({
    step: 'Discovery Job 1 (Churches in Clifton, NJ)',
    success: job1.status === 'ok' && businesses1.length > 0,
    details: {
      jobId: jobId1,
      query: 'Churches in Clifton, New Jersey',
      durationSeconds: duration1,
      finalStatus: job1.status,
      count: businesses1.length,
      sample: businesses1.slice(0, 3).map((b) => ({
        name: b.name,
        category: b.category,
        address: b.address,
        phone: b.phone,
        rating: b.rating,
        googleMapsUrl: b.googleMapsUrl,
      })),
    },
  });

  // Verify fields on discovered businesses
  if (businesses1.length > 0) {
    console.log('\n--- Sample Discovered Businesses (Real Google Maps Data) ---');
    businesses1.slice(0, 5).forEach((b, i) => {
      console.log(`\n[${i + 1}] ${b.name}`);
      console.log(`    Category: ${b.category || 'N/A'}`);
      console.log(`    Address:  ${b.address || 'N/A'}`);
      console.log(`    City/St:  ${b.city}, ${b.state} ${b.postalCode}`);
      console.log(`    Phone:    ${b.phone || 'N/A'}`);
      console.log(`    Website:  ${b.website || 'N/A'}`);
      console.log(`    Rating:   ${b.rating ? `${b.rating} (${b.reviewCount} reviews)` : 'N/A'}`);
      console.log(`    Coords:   ${b.latitude}, ${b.longitude}`);
      console.log(`    Maps URL: ${b.googleMapsUrl}`);
      console.log(`    SourceID: ${b.sourceId}`);
    });
  }

  // =========================================================================
  // STEP 3: Real Discovery Job 2 - "Gyms in Clifton, New Jersey"
  // =========================================================================
  logSection('STEP 3: Real Discovery Job 2 - "Gyms in Clifton, New Jersey"');
  const query2 = {
    category: 'Gyms',
    city: 'Clifton',
    state: 'New Jersey',
    depth: 1,
    fastMode: false,
    extractEmails: false,
    maxTimeSeconds: 300,
  };

  const t0_job2 = Date.now();
  console.log('Submitting discovery query 2 to GoSOM API...');
  const jobId2 = await gosomClient.createJob(query2);
  console.log(`[PASS] Job 2 submitted. Received Job ID: ${jobId2}`);

  console.log('Polling Job 2 until terminal state...');
  let job2: GoSOMJob = await gosomClient.getJobStatus(jobId2);
  let pollCount2 = 0;

  while (job2.status === 'pending' || job2.status === 'working') {
    pollCount2++;
    await sleep(3000);
    job2 = await gosomClient.getJobStatus(jobId2);
    const elapsed = Math.round((Date.now() - t0_job2) / 1000);
    console.log(`   [${elapsed}s] Poll #${pollCount2} - State: ${job2.status.toUpperCase()}`);
    if (elapsed > 320) {
      console.error('Job 2 exceeded max timeout of 320s');
      break;
    }
  }

  const duration2 = Math.round((Date.now() - t0_job2) / 1000);
  console.log(`Job 2 finished with status: ${job2.status.toUpperCase()} in ${duration2}s`);

  let businesses2: ScrapedBusiness[] = [];
  if (job2.status === 'ok') {
    businesses2 = await gosomClient.getJobResults(jobId2);
    console.log(`\n🎉 Successfully retrieved ${businesses2.length} gyms from Google Maps!`);
  }

  resultsSummary.push({
    step: 'Discovery Job 2 (Gyms in Clifton, NJ)',
    success: job2.status === 'ok' && businesses2.length > 0,
    details: {
      jobId: jobId2,
      query: 'Gyms in Clifton, New Jersey',
      durationSeconds: duration2,
      finalStatus: job2.status,
      count: businesses2.length,
      sample: businesses2.slice(0, 3).map((b) => ({
        name: b.name,
        category: b.category,
        address: b.address,
        phone: b.phone,
        rating: b.rating,
        googleMapsUrl: b.googleMapsUrl,
      })),
    },
  });

  if (businesses2.length > 0) {
    console.log('\n--- Sample Discovered Gyms ---');
    businesses2.slice(0, 3).forEach((b, i) => {
      console.log(`[${i + 1}] ${b.name} | Category: ${b.category} | Rating: ${b.rating} | ${b.phone}`);
    });
  }

  // =========================================================================
  // STEP 4: Controlled Failure Handling & Graceful Recovery Test
  // =========================================================================
  logSection('STEP 4: Controlled Failure Handling & Process Recovery');
  console.log('1. Stopping GoSOM engine to simulate offline service...');
  await processManager.stop();
  const isRunningAfterStop = await processManager.isRunning();
  console.log(`   Is running after stop: ${isRunningAfterStop} (Expected: false)`);

  console.log('2. Attempting health check while GoSOM is offline...');
  const healthWhenOffline = await gosomClient.healthCheck();
  console.log(`   Health check when offline: ${healthWhenOffline} (Expected: false)`);

  console.log('3. Restarting GoSOM engine...');
  await processManager.start(testPort);
  const isHealthyAfterRestart = await processManager.checkHealth();
  console.log(`   Health check after restart: ${isHealthyAfterRestart} (Expected: true)`);

  resultsSummary.push({
    step: 'Controlled Failure & Restart Test',
    success: !healthWhenOffline && isHealthyAfterRestart,
    details: {
      offlineDetected: !healthWhenOffline,
      restartSucceeded: isHealthyAfterRestart,
    },
  });

  // Save verification report to disk
  const reportPath = path.join(process.cwd(), 'phase1-5-verification-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(resultsSummary, null, 2), 'utf8');
  console.log(`\n📄 Saved complete verification report to: ${reportPath}`);

  logSection('PHASE 1.5 VERIFICATION SUMMARY');
  resultsSummary.forEach((r, idx) => {
    console.log(`${idx + 1}. [${r.success ? 'PASS' : 'FAIL'}] ${r.step}`);
  });

  const allPassed = resultsSummary.every((r) => r.success);
  console.log(`\nOVERALL VERIFICATION RESULT: ${allPassed ? '✅ GO' : '❌ NO-GO'}`);
}

runPhase15Verification().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
