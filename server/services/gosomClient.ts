/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - GoSOM HTTP Client & Local Job Manager
 */

import http from 'node:http';
import { parse } from 'csv-parse/sync';
import { GoSOMClient, GoSOMJob, LocalJobManager, ScrapedBusiness, SearchQueryParams } from '../../src/types/atlas.js';
import { settingsService } from './settings.js';
import { logger } from './logger.js';

export class GoSOMApiClientService implements GoSOMClient, LocalJobManager {
  private activeJobs: Map<string, GoSOMJob> = new Map();

  private getBaseUrl(): string {
    const settings = settingsService.getSettings();
    return `http://127.0.0.1:${settings.apiPort}`;
  }

  /**
   * Health check probe
   */
  public async healthCheck(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`${this.getBaseUrl()}/api/v1/jobs`, { timeout: 2000 }, (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
    });
  }

  /**
   * Post scraping job to GoSOM
   */
  public async postJob(payload: Record<string, unknown>): Promise<{ id: string }> {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);
      const url = new URL(`${this.getBaseUrl()}/api/v1/jobs`);

      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 5000,
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if (res.statusCode !== 201 && res.statusCode !== 200) {
            const err = new Error(`GoSOM API responded with HTTP ${res.statusCode}: ${body}`);
            logger.error('JOB_CREATE', 'Job creation error', { status: res.statusCode, body });
            return reject(err);
          }
          try {
            const json = JSON.parse(body);
            resolve({ id: json.id });
          } catch (e) {
            reject(new Error(`Failed to parse GoSOM response: ${body}`));
          }
        });
      });

      req.on('error', (err) => {
        logger.error('JOB_CREATE', `Connection error: ${err.message}`);
        reject(err);
      });

      req.write(data);
      req.end();
    });
  }

  /**
   * Create discovery job from high-level query parameters
   */
  public async createJob(params: SearchQueryParams): Promise<string> {
    logger.info('JOB_CREATE', 'Submitting discovery job to GoSOM API', params);

    // Format search keyword e.g. "Churches in Clifton, New Jersey"
    let fullQuery = params.category.trim();
    const locationParts = [params.city, params.county, params.state].filter(Boolean).map((s) => s?.trim());
    if (locationParts.length > 0) {
      fullQuery = `${fullQuery} in ${locationParts.join(', ')}`;
    }

    const jobName = `${params.category} - ${params.city}, ${params.state}`;
    const defaultLat = params.lat || (params.fastMode ? '40.8584' : '');
    const defaultLon = params.lon || (params.fastMode ? '-74.1638' : '');
    const payload = {
      name: jobName,
      keywords: [fullQuery],
      lang: 'en',
      zoom: 15,
      lat: defaultLat,
      lon: defaultLon,
      fast_mode: !!params.fastMode,
      radius: params.radius || 10000,
      depth: params.depth && params.depth > 0 ? params.depth : 1,
      email: !!params.extractEmails,
      extra_reviews: false,
      max_time: params.maxTimeSeconds || 300,
      proxies: [],
    };

    const res = await this.postJob(payload);
    const jobId = res.id;

    const initialJob: GoSOMJob = {
      id: jobId,
      name: jobName,
      date: new Date().toISOString(),
      status: 'pending',
      query: fullQuery,
      city: params.city,
      state: params.state,
      county: params.county,
      depth: payload.depth,
      fastMode: payload.fast_mode,
      email: payload.email,
      extraReviews: false,
      startedAt: Date.now(),
    };

    this.activeJobs.set(jobId, initialJob);
    logger.info('JOB_CREATE', `Job created with ID ${jobId}`);
    return jobId;
  }

  /**
   * Fetch single job details from GoSOM REST API
   */
  public async fetchJob(jobId: string): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.getBaseUrl()}/api/v1/jobs/${encodeURIComponent(jobId)}`);

      const req = http.get(url, { timeout: 3000 }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            return reject(new Error(`Failed to fetch job ${jobId}: HTTP ${res.statusCode}`));
          }
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Failed to parse job JSON: ${body}`));
          }
        });
      });

      req.on('error', reject);
    });
  }

  /**
   * Get job status and synchronize with local cache
   */
  public async getJobStatus(jobId: string): Promise<GoSOMJob> {
    const raw = await this.fetchJob(jobId);
    let job = this.activeJobs.get(jobId);

    const rawStatus = String(raw.Status || raw.status || 'pending').toLowerCase();
    const status: GoSOMJob['status'] =
      rawStatus === 'ok' ? 'ok' : rawStatus === 'working' ? 'working' : rawStatus === 'failed' ? 'failed' : 'pending';

    if (!job) {
      job = {
        id: jobId,
        name: String(raw.name || jobId),
        date: String(raw.date || new Date().toISOString()),
        status,
        query: String(raw.name || ''),
        city: '',
        state: '',
        depth: 1,
        fastMode: false,
        email: false,
        extraReviews: false,
      };
      this.activeJobs.set(jobId, job);
    } else {
      job.status = status;
    }

    if (status === 'ok' && !job.results) {
      try {
        const results = await this.getJobResults(jobId);
        job.results = results;
        job.resultCount = results.length;
        job.completedAt = Date.now();
        if (job.startedAt) {
          job.durationSeconds = Math.round((job.completedAt - job.startedAt) / 1000);
        }
        logger.info('RESULTS_FETCH', `Retrieved ${results.length} businesses for job ${jobId}`, {
          count: results.length,
          jobId,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn('RESULTS_FETCH', `Could not parse results CSV for completed job ${jobId}: ${msg}`);
      }
    }

    return job;
  }

  /**
   * List all jobs from GoSOM REST API
   */
  public async listJobs(): Promise<GoSOMJob[]> {
    return new Promise((resolve) => {
      const url = new URL(`${this.getBaseUrl()}/api/v1/jobs`);

      const req = http.get(url, { timeout: 3000 }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if (res.statusCode !== 200 || !body || body.trim() === 'null') {
            return resolve(Array.from(this.activeJobs.values()));
          }
          try {
            const rawList = JSON.parse(body);
            if (Array.isArray(rawList)) {
              rawList.forEach((raw) => {
                const id = raw?.ID || raw?.id;
                if (id) {
                  const existing = this.activeJobs.get(id);
                  const rawStatus = String(raw.Status || raw.status || 'pending').toLowerCase();
                  const status =
                    rawStatus === 'ok'
                      ? 'ok'
                      : rawStatus === 'working'
                      ? 'working'
                      : rawStatus === 'failed'
                      ? 'failed'
                      : 'pending';

                  if (existing) {
                    existing.status = status;
                  } else {
                    this.activeJobs.set(id, {
                      id,
                      name: raw.Name || raw.name || id,
                      date: raw.Date || raw.date || new Date().toISOString(),
                      status,
                      query: raw.Name || raw.name || '',
                      city: '',
                      state: '',
                      depth: 1,
                      fastMode: false,
                      email: false,
                      extraReviews: false,
                    });
                  }
                }
              });
            }
            resolve(Array.from(this.activeJobs.values()).sort((a, b) => (b.date > a.date ? 1 : -1)));
          } catch {
            resolve(Array.from(this.activeJobs.values()));
          }
        });
      });

      req.on('error', () => {
        resolve(Array.from(this.activeJobs.values()));
      });
    });
  }

  /**
   * Download and fetch CSV results stream from GoSOM
   */
  public async fetchResultsCsv(jobId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.getBaseUrl()}/api/v1/jobs/${encodeURIComponent(jobId)}/download`);

      const req = http.get(url, { timeout: 10000 }, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Download CSV failed with HTTP ${res.statusCode}`));
        }

        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve(body));
      });

      req.on('error', reject);
    });
  }

  /**
   * Download results CSV and parse into typed ScrapedBusiness records
   */
  public async getJobResults(jobId: string): Promise<ScrapedBusiness[]> {
    const csvContent = await this.fetchResultsCsv(jobId);
    if (!csvContent || csvContent.trim().length === 0) {
      return [];
    }

    try {
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as Record<string, string>[];

      const businesses: ScrapedBusiness[] = records.map((r, index) => {
        // Parse complete_address JSON if available
        let city = '';
        let state = '';
        let postalCode = '';
        let country = '';

        if (r.complete_address) {
          try {
            const addrObj = JSON.parse(r.complete_address);
            city = addrObj.city || '';
            state = addrObj.state || '';
            postalCode = addrObj.postal_code || '';
            country = addrObj.country || '';
          } catch {
            // Not json
          }
        }

        // Fallback parse from address string if complete_address is empty
        if (!city && r.address) {
          const parts = r.address.split(',').map((p) => p.trim());
          if (parts.length >= 2) {
            city = parts[parts.length - 2] || '';
            const stateZip = (parts[parts.length - 1] || '').trim().split(/\s+/);
            state = stateZip[0] || '';
            postalCode = stateZip[1] || '';
          }
        }

        const lat = parseFloat(r.latitude);
        const lon = parseFloat(r.longitude);
        const rating = parseFloat(r.review_rating);
        const reviews = parseInt(r.review_count, 10);

        // Parse emails if present
        let emails: string[] = [];
        if (r.emails) {
          emails = r.emails.split(',').map((e) => e.trim()).filter(Boolean);
        }

        return {
          id: r.input_id || r.place_id || r.cid || `place-${index + 1}`,
          name: r.title || 'Unknown Business',
          category: r.category || 'Local Business',
          address: r.address || '',
          city,
          state,
          postalCode,
          country: country || 'US',
          phone: r.phone || '',
          website: r.website || '',
          latitude: isNaN(lat) ? null : lat,
          longitude: isNaN(lon) ? null : lon,
          rating: isNaN(rating) ? null : rating,
          reviewCount: isNaN(reviews) ? null : reviews,
          googleMapsUrl: r.link || '',
          sourceId: r.cid || r.place_id || r.data_id || r.input_id || `place-${index + 1}`,
          emails,
          placeId: r.place_id,
          raw: r,
        };
      });

      return businesses;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('RESULTS_FETCH', `CSV parsing error: ${msg}`);
      throw new Error(`Failed to parse GoSOM results CSV: ${msg}`);
    }
  }

  /**
   * Delete or cancel a job
   */
  public async deleteJob(jobId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const url = new URL(`${this.getBaseUrl()}/api/v1/jobs/${encodeURIComponent(jobId)}`);

      const req = http.request(
        url,
        {
          method: 'DELETE',
          timeout: 4000,
        },
        (res) => {
          this.activeJobs.delete(jobId);
          resolve(res.statusCode === 200 || res.statusCode === 204);
        }
      );

      req.on('error', () => resolve(false));
      req.end();
    });
  }

  public async cancelJob(jobId: string): Promise<boolean> {
    return this.deleteJob(jobId);
  }
}

export const gosomClient = new GoSOMApiClientService();
