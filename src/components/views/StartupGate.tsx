import { useEffect, useState } from 'react';
import { Shield, Mic, FolderOpen, Bell, Cpu, Wifi, MapPin, Lock, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface DevicePermission {
  id: string;
  permission: string;
  display_name: string;
  granted: boolean;
  granted_at: string | null;
  description: string;
}

interface StartupGateProps {
  onComplete: () => void;
}

const PERMISSION_ICONS: Record<string, typeof Shield> = {
  microphone: Mic,
  filesystem: FolderOpen,
  notifications: Bell,
  system_control: Cpu,
  network: Wifi,
  location: MapPin,
};

const BOOT_LINES = [
  'Initializing JERVIS core systems...',
  'Loading neural command engine...',
  'Calibrating voice recognition module...',
  'Establishing secure connection...',
  'Loading mood detection algorithms...',
  'Synchronizing generative music engine...',
  'Connecting to integration services...',
  'JERVIS online. Welcome back.',
];

export function StartupGate({ onComplete }: StartupGateProps) {
  const [phase, setPhase] = useState<'boot' | 'permissions' | 'granting'>('boot');
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<DevicePermission[]>([]);
  const [granting, setGranting] = useState<string | null>(null);
  const [allGranted, setAllGranted] = useState(false);

  useEffect(() => {
    runBootSequence();
  }, []);

  async function runBootSequence() {
    for (let i = 0; i < BOOT_LINES.length; i++) {
      await new Promise((r) => setTimeout(r, 350 + Math.random() * 200));
      setBootLines((prev) => [...prev, BOOT_LINES[i]]);
    }
    await new Promise((r) => setTimeout(r, 600));
    loadPermissions();
  }

  async function loadPermissions() {
    const { data } = await supabase.from('device_permissions').select('*').order('permission');
    const typed = (data || []) as DevicePermission[];
    setPermissions(typed);

    // Check if already granted
    const allGranted = typed.length > 0 && typed.every((p) => p.granted);
    if (allGranted) {
      setAllGranted(true);
      setPhase('granting');
      setTimeout(onComplete, 1000);
    } else {
      setPhase('permissions');
    }
  }

  async function grantPermission(perm: DevicePermission) {
    setGranting(perm.permission);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));

    // Try actual browser API where possible
    if (perm.permission === 'microphone' && navigator.mediaDevices) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch { /* user may deny browser prompt — we still record the JERVIS-level grant */ }
    }
    if (perm.permission === 'notifications' && 'Notification' in window) {
      try {
        await Notification.requestPermission();
      } catch { /* */ }
    }

    await supabase
      .from('device_permissions')
      .update({ granted: true, granted_at: new Date().toISOString() })
      .eq('id', perm.id);

    setPermissions((prev) =>
      prev.map((p) => p.id === perm.id ? { ...p, granted: true, granted_at: new Date().toISOString() } : p),
    );
    setGranting(null);
  }

  async function grantAll() {
    for (const perm of permissions) {
      if (!perm.granted) {
        await grantPermission(perm);
      }
    }
    setAllGranted(true);
    setPhase('granting');
    await new Promise((r) => setTimeout(r, 800));
    onComplete();
  }

  async function denyAll() {
    // Mark as explicitly denied — proceed with limited mode
    setAllGranted(false);
    setPhase('granting');
    await new Promise((r) => setTimeout(r, 800));
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#050810] flex items-center justify-center overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 grid-bg opacity-50" />

      {/* Scan line */}
      <div className="absolute left-0 right-0 h-px bg-cyan-400/30 animate-scan-line" />

      <div className="relative z-10 w-full max-w-2xl mx-auto px-6">
        {/* Boot phase */}
        {phase === 'boot' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-8">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-orb-rotate" style={{ borderTopColor: '#22d3ee' }} />
                <div className="absolute inset-2 rounded-full bg-cyan-500/20 animate-pulse-glow flex items-center justify-center">
                  <Shield className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-mono-display font-bold text-cyan-400 text-glow tracking-wider">JERVIS</h1>
                <p className="text-xs text-slate-500 uppercase tracking-widest">AI Personal Assistant v2.0.1</p>
              </div>
            </div>

            <div className="font-mono-display text-sm space-y-1.5 min-h-[200px]">
              {bootLines.map((line, i) => (
                <div key={i} className="flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                  <span className="text-slate-400">{line}</span>
                </div>
              ))}
              {bootLines.length < BOOT_LINES.length && (
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border border-cyan-400/40 border-t-transparent rounded-full animate-spin" />
                  <span className="text-cyan-400 animate-blink">_</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Permissions phase */}
        {phase === 'permissions' && (
          <div className="animate-slide-up">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mb-4 animate-pulse-glow">
                <Lock className="w-8 h-8 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-200 mb-2">Device Access Permission</h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                JERVIS needs access to your device to work as your personal assistant.
                Review each permission below and grant access to get started.
              </p>
            </div>

            <div className="space-y-2.5 mb-6">
              {permissions.map((perm) => {
                const Icon = PERMISSION_ICONS[perm.permission] || Shield;
                const isGranting = granting === perm.permission;
                return (
                  <div
                    key={perm.id}
                    className={cn(
                      'panel p-4 flex items-center gap-4 transition-all',
                      perm.granted && 'border-green-500/30 bg-green-500/5',
                      isGranting && 'border-cyan-500/40 glow-border-cyan',
                    )}
                  >
                    <div className={cn(
                      'p-2.5 rounded-xl border flex-shrink-0',
                      perm.granted ? 'bg-green-500/10 border-green-500/30' : 'bg-[#0f1830] border-[#1a2845]',
                    )}>
                      <Icon className={cn('w-5 h-5', perm.granted ? 'text-green-400' : 'text-slate-400')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-200">{perm.display_name}</p>
                        {perm.granted && (
                          <span className="flex items-center gap-1 text-[10px] text-green-400">
                            <CheckCircle2 className="w-3 h-3" /> Granted
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{perm.description}</p>
                    </div>
                    {!perm.granted && (
                      <button
                        onClick={() => grantPermission(perm)}
                        disabled={isGranting}
                        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 transition-all disabled:opacity-50 flex-shrink-0"
                      >
                        {isGranting ? (
                          <>
                            <div className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
                            Granting...
                          </>
                        ) : (
                          <>Allow <ChevronRight className="w-3 h-3" /></>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={denyAll}
                className="flex-1 py-3 rounded-xl bg-[#0f1830] border border-[#1a2845] text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all text-sm font-medium"
              >
                Continue with limited access
              </button>
              <button
                onClick={grantAll}
                className="flex-1 py-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-all text-sm font-bold flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Grant All & Launch
              </button>
            </div>

            <p className="text-[11px] text-slate-600 text-center mt-4 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              JERVIS operates with permission-based security — you can revoke access anytime in Settings.
            </p>
          </div>
        )}

        {/* Granting / launch phase */}
        {phase === 'granting' && (
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 mb-6 animate-pulse-glow">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-200 mb-2">
              {allGranted ? 'All Systems Authorized' : 'Launching in Limited Mode'}
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              {allGranted
                ? 'JERVIS has full device access. Initializing your personal assistant...'
                : 'JERVIS is starting with limited permissions. You can grant more access later in Settings.'}
            </p>
            <div className="flex items-center justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
