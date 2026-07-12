import { useEffect, useState } from 'react';
import {
  Settings, Mic, Volume2, Shield, Bell, Zap, Brain,
  CheckCircle2, Info,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface SettingsViewProps {
  alwaysListening: boolean;
  onToggleListen: () => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
}

interface ToggleRowProps {
  icon: typeof Mic;
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  color: string;
}

function ToggleRow({ icon: Icon, label, description, value, onToggle, color }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-[#0f1830] border border-[#1a2845]">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', value ? color : 'bg-slate-500/10 text-slate-500')}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm text-slate-200 font-medium">{label}</p>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors',
          value ? 'bg-cyan-500/40' : 'bg-slate-700',
        )}
      >
        <div className={cn(
          'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform',
          value ? 'translate-x-5' : 'translate-x-0.5',
        )} />
      </button>
    </div>
  );
}

export function SettingsView({ alwaysListening, onToggleListen, voiceEnabled, onToggleVoice }: SettingsViewProps) {
  const [confirmDestructive, setConfirmDestructive] = useState(true);
  const [confirmSensitive, setConfirmSensitive] = useState(true);
  const [autoTriage, setAutoTriage] = useState(true);
  const [proactiveSuggestions, setProactiveSuggestions] = useState(true);
  const [stats, setStats] = useState({ messages: 0, commands: 0, automations: 0, integrations: 0 });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const [m, c, a, i] = await Promise.all([
      supabase.from('messages').select('*', { count: 'exact', head: true }),
      supabase.from('command_log').select('*', { count: 'exact', head: true }),
      supabase.from('automation_rules').select('*', { count: 'exact', head: true }).eq('enabled', true),
      supabase.from('integrations').select('*', { count: 'exact', head: true }).eq('status', 'connected'),
    ]);
    setStats({
      messages: m.count || 0,
      commands: c.count || 0,
      automations: a.count || 0,
      integrations: i.count || 0,
    });
  }

  return (
    <div className="h-full overflow-y-auto p-6 grid-bg">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-200 font-mono-display">Settings</h2>
          <p className="text-xs text-slate-500 mt-0.5">Configure JERVIS behavior and security preferences</p>
        </div>

        {/* Voice settings */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Mic className="w-3.5 h-3.5 text-cyan-400" /> Voice & Listening
          </h3>
          <div className="space-y-2">
            <ToggleRow
              icon={Mic}
              label="Always Listening"
              description="Continuously listen for voice commands — JERVIS hears everything"
              value={alwaysListening}
              onToggle={onToggleListen}
              color="bg-green-500/10 text-green-400"
            />
            <ToggleRow
              icon={Volume2}
              label="Voice Responses"
              description="JERVIS speaks responses aloud using text-to-speech"
              value={voiceEnabled}
              onToggle={onToggleVoice}
              color="bg-cyan-500/10 text-cyan-400"
            />
          </div>
        </div>

        {/* Security settings */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-amber-400" /> Security & Permissions
          </h3>
          <div className="space-y-2">
            <ToggleRow
              icon={Shield}
              label="Confirm Destructive Actions"
              description="Always ask before delete, revert, or kill process operations"
              value={confirmDestructive}
              onToggle={() => setConfirmDestructive(!confirmDestructive)}
              color="bg-red-500/10 text-red-400"
            />
            <ToggleRow
              icon={Shield}
              label="Confirm Sensitive Actions"
              description="Ask before sending emails, committing code, or installing packages"
              value={confirmSensitive}
              onToggle={() => setConfirmSensitive(!confirmSensitive)}
              color="bg-amber-500/10 text-amber-400"
            />
          </div>
        </div>

        {/* Automation settings */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-green-400" /> Automation & Intelligence
          </h3>
          <div className="space-y-2">
            <ToggleRow
              icon={Bell}
              label="Auto-Triage Inbox"
              description="Automatically prioritize and categorize incoming emails"
              value={autoTriage}
              onToggle={() => setAutoTriage(!autoTriage)}
              color="bg-amber-500/10 text-amber-400"
            />
            <ToggleRow
              icon={Brain}
              label="Proactive Suggestions"
              description="JERVIS proactively recommends actions based on your activity"
              value={proactiveSuggestions}
              onToggle={() => setProactiveSuggestions(!proactiveSuggestions)}
              color="bg-cyan-500/10 text-cyan-400"
            />
          </div>
        </div>

        {/* System info */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-slate-400" /> System Information
          </h3>
          <div className="panel p-5">
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Version" value="JERVIS v2.0.1" />
              <InfoRow label="Status" value="All Systems Operational" icon={<CheckCircle2 className="w-3 h-3 text-green-400" />} />
              <InfoRow label="Messages Logged" value={stats.messages.toString()} />
              <InfoRow label="Commands Executed" value={stats.commands.toString()} />
              <InfoRow label="Active Automations" value={stats.automations.toString()} />
              <InfoRow label="Connected Integrations" value={stats.integrations.toString()} />
            </div>
            <div className="mt-4 pt-4 border-t border-[#1a2845]">
              <p className="text-xs text-slate-500">
                JERVIS is a modular AI assistant system. All actions are logged and auditable.
                Sensitive and destructive operations require explicit confirmation. New integrations
                can be added through the plugin system without modifying core logic.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-600 py-4">
          <Settings className="w-3.5 h-3.5" />
          <span className="font-mono-display">JERVIS — Just an Extremely Reliable Virtual Intelligent System</span>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-300 font-mono-display flex items-center gap-1.5">
        {icon}
        {value}
      </span>
    </div>
  );
}
