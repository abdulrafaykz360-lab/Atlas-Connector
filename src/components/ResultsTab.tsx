/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - Real Discovered Businesses Results Tab
 */

import React, { useState } from 'react';
import { 
  Database, 
  ExternalLink, 
  Phone, 
  Globe, 
  Star, 
  MapPin, 
  Download, 
  Search, 
  Filter, 
  CheckCircle2, 
  Layers,
  ChevronDown
} from 'lucide-react';
import { GoSOMJob, ScrapedBusiness } from '../types/atlas.js';

interface ResultsTabProps {
  currentJob: GoSOMJob | null;
  allJobs: GoSOMJob[];
  onSelectJob: (jobId: string) => void;
}

export const ResultsTab: React.FC<ResultsTabProps> = ({
  currentJob,
  allJobs,
  onSelectJob,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterMinRating, setFilterMinRating] = useState<number>(0);
  const [filterHasPhone, setFilterHasPhone] = useState<boolean>(false);
  const [filterHasWebsite, setFilterHasWebsite] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const businesses: ScrapedBusiness[] = currentJob?.results || [];

  // Filtered businesses
  const filtered = businesses.filter((b) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        b.name.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filterMinRating > 0) {
      if (!b.rating || b.rating < filterMinRating) return false;
    }
    if (filterHasPhone && !b.phone) return false;
    if (filterHasWebsite && !b.website) return false;
    return true;
  });

  const exportCsv = () => {
    if (filtered.length === 0) return;
    const headers = [
      'Name',
      'Category',
      'Address',
      'City',
      'State',
      'PostalCode',
      'Phone',
      'Website',
      'Rating',
      'ReviewCount',
      'Latitude',
      'Longitude',
      'GoogleMapsUrl',
      'SourceId',
    ];
    const rows = filtered.map((b) => [
      `"${(b.name || '').replace(/"/g, '""')}"`,
      `"${(b.category || '').replace(/"/g, '""')}"`,
      `"${(b.address || '').replace(/"/g, '""')}"`,
      `"${(b.city || '').replace(/"/g, '""')}"`,
      `"${(b.state || '').replace(/"/g, '""')}"`,
      `"${(b.postalCode || '').replace(/"/g, '""')}"`,
      `"${(b.phone || '').replace(/"/g, '""')}"`,
      `"${(b.website || '').replace(/"/g, '""')}"`,
      b.rating ?? '',
      b.reviewCount ?? '',
      b.latitude ?? '',
      b.longitude ?? '',
      `"${(b.googleMapsUrl || '').replace(/"/g, '""')}"`,
      `"${(b.sourceId || '').replace(/"/g, '""')}"`,
    ]);

    const csvString = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atlas-leads-${currentJob?.id?.slice(0, 8) || 'export'}.csv`;
    link.click();
  };

  const exportJson = () => {
    if (filtered.length === 0) return;
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atlas-leads-${currentJob?.id?.slice(0, 8) || 'export'}.json`;
    link.click();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Job Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <Database className="w-4 h-4" />
            Verified Google Maps Leads
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Discovered Businesses
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real data returned from local GoSOM scrape jobs. No placeholder or simulated results.
          </p>
        </div>

        {/* Job Switcher Dropdown */}
        {allJobs.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Active Job:</span>
            <select
              value={currentJob?.id || ''}
              onChange={(e) => onSelectJob(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
            >
              {allJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.query || j.name} ({j.resultCount ?? 0} results)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Current Job Metadata Card */}
      {currentJob ? (
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{currentJob.query}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono">
                  {currentJob.status.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-4 mt-1 font-mono">
                <span>Job ID: <code className="text-zinc-200">{currentJob.id}</code></span>
                <span>&bull;</span>
                <span>Total Results: <strong className="text-white">{currentJob.resultCount ?? businesses.length}</strong></span>
                {currentJob.durationSeconds && (
                  <>
                    <span>&bull;</span>
                    <span>Duration: <strong className="text-white">{currentJob.durationSeconds}s</strong></span>
                  </>
                )}
                <span>&bull;</span>
                <span>Source: <strong className="text-cyan-400">Local GoSOM Engine</strong></span>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={exportCsv}
                disabled={filtered.length === 0}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={exportJson}
                disabled={filtered.length === 0}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by name, city, category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-cyan-500 w-56"
                />
              </div>

              {/* Has phone */}
              <label className="flex items-center gap-1.5 text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterHasPhone}
                  onChange={(e) => setFilterHasPhone(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-800 text-cyan-500"
                />
                <span>Has Phone</span>
              </label>

              {/* Has website */}
              <label className="flex items-center gap-1.5 text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterHasWebsite}
                  onChange={(e) => setFilterHasWebsite(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-800 text-cyan-500"
                />
                <span>Has Website</span>
              </label>

              {/* Rating filter */}
              <select
                value={filterMinRating}
                onChange={(e) => setFilterMinRating(Number(e.target.value))}
                className="px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs focus:outline-none"
              >
                <option value="0">All Ratings</option>
                <option value="3">3.0+ Stars</option>
                <option value="4">4.0+ Stars</option>
                <option value="4.5">4.5+ Stars</option>
              </select>
            </div>

            <div className="flex items-center gap-3 text-zinc-400">
              <span>Showing {filtered.length} of {businesses.length}</span>
              <div className="flex rounded-lg bg-zinc-950 border border-zinc-800 p-0.5">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    viewMode === 'table' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    viewMode === 'cards' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
                  }`}
                >
                  Cards
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center space-y-3">
          <Database className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Discovery Results Selected</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Execute a discovery query in the <strong>Test Search</strong> tab to retrieve and inspect real businesses from Google Maps.
          </p>
        </div>
      )}

      {/* Results View: Table */}
      {currentJob && viewMode === 'table' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 uppercase font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Business Name</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Location</th>
                  <th className="py-3 px-4 font-semibold">Contact</th>
                  <th className="py-3 px-4 font-semibold">Rating</th>
                  <th className="py-3 px-4 font-semibold">Coordinates</th>
                  <th className="py-3 px-4 font-semibold text-right">Maps Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500 italic">
                      No businesses match the active filter criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((biz) => (
                    <tr key={biz.id} className="hover:bg-zinc-900/40 transition">
                      {/* Name */}
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="max-w-xs truncate" title={biz.name}>
                          {biz.name}
                        </div>
                        {biz.sourceId && (
                          <div className="text-[10px] font-mono text-zinc-500 truncate" title={biz.sourceId}>
                            ID: {biz.sourceId.slice(0, 16)}...
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-zinc-300">
                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px]">
                          {biz.category || 'N/A'}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4">
                        <div className="text-zinc-300 max-w-xs truncate" title={biz.address}>
                          {biz.address || 'Address unavailable'}
                        </div>
                        {(biz.city || biz.state) && (
                          <div className="text-[11px] text-zinc-400">
                            {[biz.city, biz.state, biz.postalCode].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 space-y-1">
                        {biz.phone ? (
                          <a
                            href={`tel:${biz.phone}`}
                            className="flex items-center gap-1.5 text-cyan-400 hover:underline font-mono text-[11px]"
                          >
                            <Phone className="w-3 h-3 shrink-0" />
                            <span>{biz.phone}</span>
                          </a>
                        ) : (
                          <span className="text-zinc-600 text-[11px]">No phone</span>
                        )}

                        {biz.website ? (
                          <a
                            href={biz.website.startsWith('http') ? biz.website : `https://${biz.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-blue-400 hover:underline text-[11px] truncate max-w-[140px]"
                            title={biz.website}
                          >
                            <Globe className="w-3 h-3 shrink-0" />
                            <span className="truncate">{biz.website.replace(/^https?:\/\//, '')}</span>
                          </a>
                        ) : (
                          <span className="text-zinc-600 text-[11px] block">No website</span>
                        )}
                      </td>

                      {/* Rating */}
                      <td className="py-3.5 px-4">
                        {biz.rating !== null ? (
                          <div className="flex items-center gap-1.5">
                            <span className="flex items-center text-amber-400 font-bold font-mono">
                              <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" />
                              {biz.rating.toFixed(1)}
                            </span>
                            <span className="text-zinc-500 text-[11px]">
                              ({biz.reviewCount ?? 0})
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-600">N/A</span>
                        )}
                      </td>

                      {/* Coordinates */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400">
                        {biz.latitude !== null && biz.longitude !== null ? (
                          <span>
                            {biz.latitude.toFixed(4)}, {biz.longitude.toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-zinc-600">N/A</span>
                        )}
                      </td>

                      {/* Maps Link */}
                      <td className="py-3.5 px-4 text-right">
                        {biz.googleMapsUrl ? (
                          <a
                            href={biz.googleMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-cyan-400 hover:text-cyan-300 transition"
                            title="View on Google Maps"
                          >
                            <span>Map</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-zinc-600 text-[11px]">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results View: Cards */}
      {currentJob && viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((biz) => (
            <div key={biz.id} className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-white tracking-tight leading-snug">{biz.name}</h4>
                  {biz.rating !== null && (
                    <span className="flex items-center gap-1 text-amber-400 font-bold font-mono text-xs shrink-0">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {biz.rating.toFixed(1)}
                    </span>
                  )}
                </div>

                <div className="inline-block px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400">
                  {biz.category || 'Local Business'}
                </div>

                <p className="text-xs text-zinc-400 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                  <span>{biz.address || 'Address unavailable'}</span>
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 space-y-2 text-xs">
                {biz.phone && (
                  <div className="flex items-center gap-2 text-zinc-300 font-mono text-[11px]">
                    <Phone className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>{biz.phone}</span>
                  </div>
                )}
                {biz.website && (
                  <a
                    href={biz.website.startsWith('http') ? biz.website : `https://${biz.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-blue-400 hover:underline truncate"
                  >
                    <Globe className="w-3 h-3 shrink-0" />
                    <span className="truncate">{biz.website}</span>
                  </a>
                )}
                {biz.googleMapsUrl && (
                  <a
                    href={biz.googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block text-center py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-cyan-400 text-xs font-semibold transition"
                  >
                    Open in Google Maps
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
