import { useEffect, useState } from 'react';
import { History, Shield, ShieldAlert, ShieldX, CheckCircle2, XCircle, AlertTriangle, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CommandLogEntry } from '../../types';
import { formatRelativeTime, formatDateTime, cn } from '../../lib/utils';

const RISK_ICONS = {
  safe: Shield,
  moderate: Shield,
  sensitive: ShieldAlert,
  destructive: ShieldX,
};

const STATUS_ICONS = {
  executed: CheckCircle2,
  denied: XCircle,
  failed: AlertTriangle,
  pending: History,
};

const RISK_COLORS = {
  safe: 'text-green-400',
  moderate: 'text-cyan-400',
  sensitive: 'text-amber-400',
  destructive: 'text-red-400',
};

const STATUS_COLORS = {
  executed: 'text-green-400',
  denied: 'text-red-400',
  failed: 'text-amber-400',
  pending: 'text-slate-400',
};

export function HistoryView() {
  const [logs, setLogs] = useState<CommandLogEntry[]>([]);
  const [filtered, setFiltered] = useState<CommandLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    const { data } = await supabase.from('command_log').select('*').order('created_at', { ascending: false }).limit(100);
    setLogs((data || []) as CommandLogEntry[]);
    setFiltered((data || []) as CommandLogEntry[]);
    setLoading(false);
  }

  useEffect(() => {
    let result = logs;
    if (search) {
      result = result.filter((l) => l.command.toLowerCase().includes(search.toLowerCase()) || l.intent?.toLowerCase().includes(search.toLowerCase()));
    }
    if (statusFilter !== 'all') {
      result = result.filter((l) => l.status === statusFilter);
    }
    setFiltered(result);
  }, [search, statusFilter, logs]);

  if (loading) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading command history...</div>;

  const executed = logs.filter((l) => l.status === 'executed').length;
  const denied = logs.filter((l) => l.status === 'denied').length;
  const failed = logs.filter((l) => l.status === 'failed').length;

  return (
    <div className="h-full overflow-y-auto p-6 grid-bg">
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-200 font-mono-display">Command History</h2>
          <p className="text-xs text-slate-500 mt-0.5">Complete audit log of all actions JERVIS has taken</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="panel p-4 text-center">
            <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <div className="text-xl font-bold text-green-400 font-mono-display">{executed}</div>
            <div className="text-[10px] text-slate-500 uppercase">Executed</div>
          </div>
          <div className="panel p-4 text-center">
            <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <div className="text-xl font-bold text-red-400 font-mono-display">{denied}</div>
            <div className="text-[10px] text-slate-500 uppercase">Denied</div>
          </div>
          <div className="panel p-4 text-center">
            <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <div className="text-xl font-bold text-amber-400 font-mono-display">{failed}</div>
            <div className="text-[10px] text-slate-500 uppercase">Failed</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search commands..."
              className="w-full bg-[#0f1830] border border-[#1a2845] rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40"
            />
          </div>
          <div className="flex gap-1">
            {['all', 'executed', 'denied', 'failed'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'text-xs px-3 py-2 rounded-lg border transition-all capitalize',
                  statusFilter === s
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                    : 'bg-[#0f1830] border-[#1a2845] text-slate-400 hover:text-slate-200',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Log entries */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center text-slate-500 py-8 text-sm">No matching commands</div>
          )}
          {filtered.map((log) => {
            const RiskIcon = RISK_ICONS[log.risk_level];
            const StatusIcon = STATUS_ICONS[log.status];
            return (
              <div key={log.id} className="panel p-4">
                <div className="flex items-start gap-3">
                  <div className={cn('p-1.5 rounded-lg flex-shrink-0', `bg-white/5`)}>
                    <StatusIcon className={cn('w-4 h-4', STATUS_COLORS[log.status])} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm text-slate-200 font-mono-display truncate">{log.command}</code>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
                      <span className="text-slate-400">{formatDateTime(log.created_at)}</span>
                      {log.intent && <span className="text-cyan-500">[{log.intent}]</span>}
                      <span className={cn('flex items-center gap-1', RISK_COLORS[log.risk_level])}>
                        <RiskIcon className="w-3 h-3" /> {log.risk_level}
                      </span>
                      {log.confirmed && <span className="text-green-500">confirmed</span>}
                      <span className={STATUS_COLORS[log.status]}>{log.status}</span>
                    </div>
                    {log.action && (
                      <p className="text-xs text-slate-400 mt-1">{log.action}</p>
                    )}
                    {log.detail && (
                      <p className="text-xs text-slate-500 mt-0.5 italic">{log.detail}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-600 flex-shrink-0">{formatRelativeTime(log.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
