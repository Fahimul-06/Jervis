import { useEffect, useState } from 'react';
import {
  Github, Mail, Calendar as CalIcon, HardDrive, MessageCircle,
  Twitter, CheckCircle2, XCircle, AlertCircle, RefreshCw, Plug,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Integration } from '../../types';
import { formatRelativeTime, cn } from '../../lib/utils';

const SERVICE_ICONS: Record<string, typeof Github> = {
  github: Github,
  email: Mail,
  calendar: CalIcon,
  filesystem: HardDrive,
  slack: MessageCircle,
  twitter: Twitter,
};

const SERVICE_COLORS: Record<string, string> = {
  github: '#6e7681',
  email: '#f59e0b',
  calendar: '#3b82f6',
  filesystem: '#22d3ee',
  slack: '#4a154b',
  twitter: '#1d9bf0',
};

export function IntegrationsView() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function loadIntegrations() {
    const { data } = await supabase.from('integrations').select('*').order('status', { ascending: true });
    setIntegrations((data || []) as Integration[]);
    setLoading(false);
  }

  async function toggleIntegration(integration: Integration) {
    const newStatus = integration.status === 'connected' ? 'disconnected' : 'connected';
    setSyncing(integration.service);
    await supabase
      .from('integrations')
      .update({ status: newStatus, last_synced_at: newStatus === 'connected' ? new Date().toISOString() : null })
      .eq('id', integration.id);
    await loadIntegrations();
    setSyncing(null);
  }

  async function syncNow(integration: Integration) {
    setSyncing(integration.service);
    await supabase
      .from('integrations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', integration.id);
    await loadIntegrations();
    setTimeout(() => setSyncing(null), 800);
  }

  if (loading) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading integrations...</div>;

  return (
    <div className="h-full overflow-y-auto p-6 grid-bg">
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-200 font-mono-display">Integrations</h2>
          <p className="text-xs text-slate-500 mt-0.5">Connect external services — modular system designed for extensibility</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration) => {
            const Icon = SERVICE_ICONS[integration.service] || Plug;
            const color = SERVICE_COLORS[integration.service] || '#64748b';
            const connected = integration.status === 'connected';
            const isSyncing = syncing === integration.service;

            return (
              <div key={integration.id} className="panel p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-3 rounded-xl border"
                      style={{ background: `${color}15`, borderColor: `${color}30` }}
                    >
                      <Icon className="w-6 h-6" style={{ color }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">{integration.display_name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {connected ? (
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                        ) : integration.status === 'error' ? (
                          <AlertCircle className="w-3 h-3 text-red-400" />
                        ) : (
                          <XCircle className="w-3 h-3 text-slate-500" />
                        )}
                        <span className={cn(
                          'text-xs',
                          connected ? 'text-green-400' : integration.status === 'error' ? 'text-red-400' : 'text-slate-500',
                        )}>
                          {integration.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Config info */}
                {Object.keys(integration.config).length > 0 && (
                  <div className="bg-[#0a1020] border border-[#1a2845] rounded-lg p-3 mb-4">
                    {Object.entries(integration.config).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-xs py-0.5">
                        <span className="text-slate-500">{key}</span>
                        <span className="text-slate-300 font-mono-display">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {integration.last_synced_at ? `Synced ${formatRelativeTime(integration.last_synced_at)}` : 'Never synced'}
                  </span>
                  <div className="flex gap-2">
                    {connected && (
                      <button
                        onClick={() => syncNow(integration)}
                        disabled={isSyncing}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#0f1830] border border-[#1a2845] text-slate-400 hover:text-cyan-300 disabled:opacity-50"
                      >
                        <RefreshCw className={cn('w-3 h-3', isSyncing && 'animate-spin')} />
                        Sync
                      </button>
                    )}
                    <button
                      onClick={() => toggleIntegration(integration)}
                      className={cn(
                        'text-xs px-3 py-1.5 rounded-lg border transition-all',
                        connected
                          ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                          : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20',
                      )}
                    >
                      {connected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-2">
            <Plug className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-200">Modular Architecture</h3>
          </div>
          <p className="text-sm text-slate-400">
            JERVIS uses a plugin-based integration system. Each service connects through a standardized interface,
            making it easy to add new integrations. New services can be registered without modifying core logic.
          </p>
        </div>
      </div>
    </div>
  );
}
