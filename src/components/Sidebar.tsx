import { cn } from '../lib/utils';
import type { ViewKey } from '../types';
import {
  MessageSquare,
  LayoutDashboard,
  Activity,
  FolderOpen,
  Github,
  Mail,
  Calendar,
  Plug,
  Zap,
  History,
  Settings,
  Shield,
  Facebook,
  Music,
  Radio,
} from 'lucide-react';

interface SidebarProps {
  current: ViewKey;
  onNavigate: (view: ViewKey) => void;
  unreadNotifications: number;
  collapsed: boolean;
}

const NAV_ITEMS: { key: ViewKey; label: string; icon: typeof MessageSquare }[] = [
  { key: 'chat', label: 'JERVIS Chat', icon: MessageSquare },
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'system', label: 'System Health', icon: Activity },
  { key: 'devices', label: 'Devices', icon: Radio },
  { key: 'files', label: 'Files', icon: FolderOpen },
  { key: 'github', label: 'GitHub', icon: Github },
  { key: 'facebook', label: 'Facebook', icon: Facebook },
  { key: 'spotify', label: 'Spotify', icon: Music },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'calendar', label: 'Calendar', icon: Calendar },
  { key: 'integrations', label: 'Integrations', icon: Plug },
  { key: 'automation', label: 'Automation', icon: Zap },
  { key: 'history', label: 'History', icon: History },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ current, onNavigate, unreadNotifications, collapsed }: SidebarProps) {
  return (
    <aside
      className={cn(
        'h-full border-r border-[#1a2845] bg-[#070b16] flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#1a2845]">
        <div className="relative flex-shrink-0 w-8 h-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-lg border border-cyan-400/50 animate-pulse-glow" />
          <Shield className="w-5 h-5 text-cyan-400" strokeWidth={2} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="font-mono-display text-sm font-bold text-cyan-400 text-glow tracking-wider">
              JERVIS
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest">AI Assistant</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          const showBadge = item.key === 'chat' && unreadNotifications > 0;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all relative group',
                active
                  ? 'text-cyan-300 bg-cyan-500/5 border-r-2 border-cyan-400'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/5',
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.8} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {showBadge && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unreadNotifications}
                </span>
              )}
              {active && !collapsed && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-l-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer status */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-[#1a2845]">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-slate-500 font-mono-display">SYS ONLINE</span>
          </div>
          <div className="text-[10px] text-slate-600 mt-1 font-mono-display">v2.0.1 — all modules active</div>
        </div>
      )}
    </aside>
  );
}
