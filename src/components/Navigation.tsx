/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Atlas Connector - Navigation Sidebar / Bar
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Wrench, 
  Cpu, 
  Search, 
  Database, 
  Stethoscope, 
  ScrollText, 
  Sliders, 
  Package
} from 'lucide-react';

export type NavTab = 
  | 'overview' 
  | 'setup' 
  | 'engine' 
  | 'search' 
  | 'results' 
  | 'diagnostics' 
  | 'logs' 
  | 'settings'
  | 'package';

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  resultCount?: number;
  hasErrors?: boolean;
  needsSetup?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  resultCount = 0,
  hasErrors = false,
  needsSetup = false,
}) => {
  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { 
      id: 'setup' as NavTab, 
      label: 'Setup Wizard', 
      icon: Wrench,
      badge: needsSetup ? 'Action' : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    { id: 'engine' as NavTab, label: 'GoSOM Engine', icon: Cpu },
    { id: 'search' as NavTab, label: 'Test Search', icon: Search },
    { 
      id: 'results' as NavTab, 
      label: 'Results', 
      icon: Database,
      badge: resultCount > 0 ? String(resultCount) : undefined,
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    },
    { 
      id: 'diagnostics' as NavTab, 
      label: 'Diagnostics', 
      icon: Stethoscope,
      badge: hasErrors ? 'Issues' : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    },
    { id: 'logs' as NavTab, label: 'Logs', icon: ScrollText },
    { id: 'settings' as NavTab, label: 'Settings', icon: Sliders },
    { id: 'package' as NavTab, label: 'Windows Build', icon: Package },
  ];

  return (
    <nav className="w-64 border-r border-zinc-800/80 bg-zinc-950/60 p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-zinc-300 tracking-wider uppercase">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-zinc-300'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Safety & Sandbox Notice */}
      <div className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
        <div className="font-semibold text-zinc-300 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Execution Sandbox
        </div>
        <p className="leading-relaxed">
          Child processes run exclusively via fixed argument arrays. No remote shell or arbitrary execution permitted.
        </p>
      </div>
    </nav>
  );
};
