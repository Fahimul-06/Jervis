import { useEffect, useState } from 'react';
import {
  Cpu, MemoryStick, HardDrive, Wifi, Battery,
  Calendar, Mail, Github, Bell, Zap, TrendingUp,
  ArrowRight, AlertCircle, CheckCircle2, Clock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatRelativeTime, formatTimeUntil, formatTime, cn } from '../../lib/utils';
import type { CalendarEvent, Email, GithubRepo, Reminder, SystemMetric, CommandLogEntry, ViewKey, Notification } from '../../types';

interface DashboardViewProps {
  onNavigate: (view: ViewKey) => void;
}

interface Stats {
  latestMetric: SystemMetric | null;
  upcomingEvents: CalendarEvent[];
  unreadEmails: Email[];
  repos: GithubRepo[];
  notifications: Notification[];
  activeReminders: Reminder[];
  recentCommands: CommandLogEntry[];
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const [stats, setStats] = useState<Stats>({
    latestMetric: null,
    upcomingEvents: [],
    unreadEmails: [],
    repos: [],
    notifications: [],
    activeReminders: [],
    recentCommands: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const [metricsRes, eventsRes, emailsRes, reposRes, notifsRes, remindersRes, commandsRes] = await Promise.all([
      supabase.from('system_metrics').select('*').order('recorded_at', { ascending: false }).limit(1),
      supabase.from('calendar_events').select('*').gte('start_at', new Date().toISOString()).order('start_at', { ascending: true }).limit(3),
      supabase.from('emails').select('*').eq('is_read', false).eq('folder', 'inbox').order('priority_score', { ascending: false }).limit(3),
      supabase.from('github_repos').select('*').order('last_commit_at', { ascending: false }),
      supabase.from('notifications').select('*').eq('read', false).order('created_at', { ascending: false }).limit(5),
      supabase.from('reminders').select('*').eq('completed', false).order('due_at', { ascending: true }).limit(4),
      supabase.from('command_log').select('*').order('created_at', { ascending: false }).limit(4),
    ]);

    setStats({
      latestMetric: (metricsRes.data?.[0] as SystemMetric) || null,
      upcomingEvents: (eventsRes.data || []) as CalendarEvent[],
      unreadEmails: (emailsRes.data || []) as Email[],
      repos: (reposRes.data || []) as GithubRepo[],
      notifications: (notifsRes.data || []) as Notification[],
      activeReminders: (remindersRes.data || []) as Reminder[],
      recentCommands: (commandsRes.data || []) as CommandLogEntry[],
    });
    setLoading(false);
  }

  const m = stats.latestMetric;

  const statCards = [
    { label: 'CPU', value: m ? `${m.cpu_percent.toFixed(0)}%` : '—', icon: Cpu, color: m && m.cpu_percent > 80 ? 'text-red-400' : 'text-cyan-400', bg: 'bg-cyan-500/10', view: 'system' as ViewKey },
    { label: 'Memory', value: m ? `${m.memory_percent.toFixed(0)}%` : '—', icon: MemoryStick, color: m && m.memory_percent > 85 ? 'text-red-400' : 'text-green-400', bg: 'bg-green-500/10', view: 'system' as ViewKey },
    { label: 'Disk', value: m ? `${m.disk_percent.toFixed(0)}%` : '—', icon: HardDrive, color: m && m.disk_percent > 90 ? 'text-red-400' : 'text-amber-400', bg: 'bg-amber-500/10', view: 'system' as ViewKey },
    { label: 'Network', value: m ? `${m.network_down_mbps.toFixed(0)} Mbps` : '—', icon: Wifi, color: 'text-blue-400', bg: 'bg-blue-500/10', view: 'system' as ViewKey },
    { label: 'Battery', value: m ? `${m.battery_percent ?? '—'}%` : '—', icon: Battery, color: 'text-green-400', bg: 'bg-green-500/10', view: 'system' as ViewKey },
    { label: 'Uptime', value: m ? `${m.uptime_hours.toFixed(0)}h` : '—', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/10', view: 'system' as ViewKey },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading system status...</div>;
  }

  return (
    <div className="h-full overflow-y-auto p-6 grid-bg">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-200 font-mono-display">Mission Control</h2>
            <p className="text-xs text-slate-500 mt-0.5">Real-time overview of your digital environment</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-green-400 font-mono-display">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            ALL SYSTEMS OPERATIONAL
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <button
                key={stat.label}
                onClick={() => onNavigate(stat.view)}
                className="panel panel-hover p-4 text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                </div>
                <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{stat.label}</div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Calendar */}
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-200">Upcoming Events</h3>
              </div>
              <button onClick={() => onNavigate('calendar')} className="text-xs text-slate-500 hover:text-cyan-300">
                View all
              </button>
            </div>
            <div className="space-y-2">
              {stats.upcomingEvents.length === 0 && (
                <p className="text-xs text-slate-500 py-3 text-center">No upcoming events</p>
              )}
              {stats.upcomingEvents.map((e) => (
                <div key={e.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: e.color || '#3b82f6' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{e.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatTime(e.start_at)} — {formatTimeUntil(e.start_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Email */}
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-200">Priority Emails</h3>
              </div>
              <button onClick={() => onNavigate('email')} className="text-xs text-slate-500 hover:text-cyan-300">
                View all
              </button>
            </div>
            <div className="space-y-2">
              {stats.unreadEmails.length === 0 && (
                <p className="text-xs text-slate-500 py-3 text-center">Inbox clear</p>
              )}
              {stats.unreadEmails.map((e) => (
                <div key={e.id} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-200 truncate">{e.subject}</p>
                    {e.priority_score > 80 && (
                      <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">URGENT</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{e.from_name || e.from_address}</p>
                </div>
              ))}
            </div>
          </div>

          {/* GitHub */}
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Github className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-bold text-slate-200">Repositories</h3>
              </div>
              <button onClick={() => onNavigate('github')} className="text-xs text-slate-500 hover:text-cyan-300">
                View all
              </button>
            </div>
            <div className="space-y-2">
              {stats.repos.map((r) => (
                <div key={r.id} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-200 truncate">{r.name}</p>
                    <span className={cn(
                      'text-[9px] font-bold px-1.5 py-0.5 rounded',
                      r.health_status === 'healthy' ? 'text-green-400 bg-green-500/10' : 'text-amber-400 bg-amber-500/10',
                    )}>
                      {r.health_status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {r.open_issues} issues — {r.last_commit_at ? `commit ${formatTimeUntil(r.last_commit_at)}` : 'no commits'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Notifications */}
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-200">Notifications</h3>
                <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">{stats.notifications.length}</span>
              </div>
            </div>
            <div className="space-y-2">
              {stats.notifications.slice(0, 4).map((n) => {
                const Icon = n.severity === 'error' ? AlertCircle : n.severity === 'warning' ? AlertCircle : n.severity === 'success' ? CheckCircle2 : Bell;
                const color = n.severity === 'error' ? 'text-red-400' : n.severity === 'warning' ? 'text-amber-400' : n.severity === 'success' ? 'text-green-400' : 'text-cyan-400';
                return (
                  <div key={n.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{n.title}</p>
                      <p className="text-xs text-slate-500">{formatRelativeTime(n.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reminders + Recent Activity */}
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-200">Active Reminders</h3>
              </div>
              <button onClick={() => onNavigate('chat')} className="text-xs text-slate-500 hover:text-cyan-300">Add</button>
            </div>
            <div className="space-y-2 mb-4">
              {stats.activeReminders.slice(0, 3).map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    r.priority === 'high' ? 'bg-red-400' : r.priority === 'medium' ? 'bg-amber-400' : 'bg-green-400',
                  )} />
                  <p className="text-sm text-slate-200 truncate flex-1">{r.title}</p>
                  <span className="text-xs text-slate-500 font-mono-display">{formatTimeUntil(r.due_at)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-[#1a2845] pt-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Commands</h4>
              </div>
              <div className="space-y-1.5">
                {stats.recentCommands.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-xs">
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full flex-shrink-0',
                      c.status === 'executed' ? 'bg-green-400' : c.status === 'denied' ? 'bg-red-400' : c.status === 'failed' ? 'bg-orange-400' : 'bg-slate-500',
                    )} />
                    <span className="text-slate-400 truncate flex-1 font-mono-display">{c.command}</span>
                    <span className="text-slate-600">{formatRelativeTime(c.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
