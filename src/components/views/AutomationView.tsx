import { useEffect, useState } from 'react';
import { Zap, Clock, Play, Pause, Plus, Settings2, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AutomationRule } from '../../types';
import { formatRelativeTime, cn } from '../../lib/utils';

const TRIGGER_LABELS: Record<string, string> = {
  schedule: 'Scheduled',
  event: 'Event-based',
  command_keyword: 'Keyword',
};

export function AutomationView() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    const { data } = await supabase.from('automation_rules').select('*').order('enabled', { ascending: false });
    setRules((data || []) as AutomationRule[]);
    setLoading(false);
  }

  async function toggleRule(rule: AutomationRule) {
    await supabase.from('automation_rules').update({ enabled: !rule.enabled }).eq('id', rule.id);
    loadRules();
  }

  if (loading) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading automation rules...</div>;

  const enabledCount = rules.filter((r) => r.enabled).length;
  const totalRuns = rules.reduce((s, r) => s + r.run_count, 0);

  return (
    <div className="h-full overflow-y-auto p-6 grid-bg">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-200 font-mono-display">Automation Rules</h2>
            <p className="text-xs text-slate-500 mt-0.5">Automate repetitive tasks — triggers fire actions automatically</p>
          </div>
          <button className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20">
            <Plus className="w-4 h-4" /> New Rule
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="panel p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-slate-500">Active Rules</span>
            </div>
            <div className="text-2xl font-bold text-cyan-400 font-mono-display">{enabledCount}</div>
          </div>
          <div className="panel p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-xs text-slate-500">Total Executions</span>
            </div>
            <div className="text-2xl font-bold text-green-400 font-mono-display">{totalRuns.toLocaleString()}</div>
          </div>
          <div className="panel p-4">
            <div className="flex items-center gap-2 mb-1">
              <Settings2 className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-500">Total Rules</span>
            </div>
            <div className="text-2xl font-bold text-amber-400 font-mono-display">{rules.length}</div>
          </div>
        </div>

        {/* Rules list */}
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className={cn('panel p-4 transition-all', !rule.enabled && 'opacity-50')}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={cn(
                    'p-2 rounded-lg',
                    rule.enabled ? 'bg-green-500/10' : 'bg-slate-500/10',
                  )}>
                    <Zap className={cn('w-4 h-4', rule.enabled ? 'text-green-400' : 'text-slate-500')} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-200">{rule.name}</h3>
                      <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20">
                        {TRIGGER_LABELS[rule.trigger_type] || rule.trigger_type}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="text-slate-600">Trigger:</span>
                        <code className="text-cyan-400">{rule.trigger_type === 'schedule' ? String((rule.trigger_config as Record<string, unknown>).time || '—') : String((rule.trigger_config as Record<string, unknown>).event || '—')}</code>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-slate-600">Action:</span>
                        <code className="text-amber-400">{rule.action_type}</code>
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" /> {rule.run_count} runs
                      </span>
                      {rule.last_run_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Last: {formatRelativeTime(rule.last_run_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleRule(rule)}
                  className={cn(
                    'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all',
                    rule.enabled
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20'
                      : 'bg-green-500/10 border-green-500/20 text-green-300 hover:bg-green-500/20',
                  )}
                >
                  {rule.enabled ? <><Pause className="w-3 h-3" /> Disable</> : <><Play className="w-3 h-3" /> Enable</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
