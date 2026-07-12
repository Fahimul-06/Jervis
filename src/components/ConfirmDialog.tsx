import { Shield, ShieldAlert, ShieldX, X } from 'lucide-react';
import type { IntentResult, RiskLevel } from '../types';

interface ConfirmDialogProps {
  intent: IntentResult;
  command: string;
  onConfirm: () => void;
  onDeny: () => void;
}

const riskConfig: Record<RiskLevel, { icon: typeof Shield; color: string; bg: string; border: string; label: string }> = {
  safe: { icon: Shield, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'Safe' },
  moderate: { icon: Shield, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', label: 'Moderate' },
  sensitive: { icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Sensitive' },
  destructive: { icon: ShieldX, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Destructive' },
};

export function ConfirmDialog({ intent, command, onConfirm, onDeny }: ConfirmDialogProps) {
  const cfg = riskConfig[intent.riskLevel];
  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onDeny} />
      <div className={`relative panel ${cfg.border} max-w-md w-full mx-4 animate-slide-up`}>
        <div className="flex items-center justify-between p-5 border-b border-[#1a2845]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${cfg.bg}`}>
              <Icon className={`w-6 h-6 ${cfg.color}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">Confirmation Required</h3>
              <p className={`text-xs font-mono-display ${cfg.color}`}>Risk Level: {cfg.label}</p>
            </div>
          </div>
          <button onClick={onDeny} className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Your Command</p>
            <p className="text-sm text-slate-200 bg-[#0a1020] rounded-lg p-3 font-mono-display">"{command}"</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">JERVIS Will</p>
            <p className="text-sm text-slate-300">{intent.actionDescription}</p>
          </div>
          {intent.riskLevel === 'destructive' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-xs text-red-300">
                Warning: This is a destructive action. Data may be permanently lost and cannot be undone.
              </p>
            </div>
          )}
          {intent.riskLevel === 'sensitive' && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-xs text-amber-300">
                This action modifies data or sends communications on your behalf. Please review carefully.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-[#1a2845]">
          <button
            onClick={onDeny}
            className="flex-1 py-2.5 rounded-lg bg-[#0f1830] border border-[#1a2845] text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-lg ${cfg.bg} ${cfg.border} border ${cfg.color} hover:brightness-125 transition-all text-sm font-bold`}
          >
            Authorize & Execute
          </button>
        </div>
      </div>
    </div>
  );
}
