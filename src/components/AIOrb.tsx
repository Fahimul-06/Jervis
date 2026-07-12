import { cn } from '../lib/utils';
import type { VoiceState } from '../hooks/useVoice';

interface OrbProps {
  state: VoiceState;
  size?: number;
  className?: string;
}

export function AIOrb({ state, size = 200, className }: OrbProps) {
  const colorMap: Record<VoiceState, string> = {
    idle: '#22d3ee',
    listening: '#10b981',
    processing: '#f59e0b',
    speaking: '#f0b429',
  };
  const color = colorMap[state];

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {/* Outer rotating ring */}
      <div
        className="absolute inset-0 rounded-full border-2 animate-orb-rotate"
        style={{
          borderColor: 'transparent',
          borderTopColor: color,
          borderRightColor: `${color}40`,
          opacity: 0.6,
        }}
      />

      {/* Inner rotating ring (reverse) */}
      <div
        className="absolute rounded-full border-2 animate-orb-rotate-reverse"
        style={{
          inset: size * 0.1,
          borderColor: 'transparent',
          borderBottomColor: color,
          borderLeftColor: `${color}30`,
          opacity: 0.5,
        }}
      />

      {/* Pulse rings */}
      <div
        className="absolute inset-0 rounded-full animate-pulse-glow"
        style={{ boxShadow: `0 0 40px ${color}40, inset 0 0 40px ${color}20` }}
      />

      {/* Core sphere */}
      <div
        className="relative rounded-full transition-all duration-500"
        style={{
          width: size * 0.55,
          height: size * 0.55,
          background: `radial-gradient(circle at 35% 35%, ${color}, ${color}30 60%, transparent 80%)`,
          boxShadow: `0 0 30px ${color}80, inset 0 0 30px ${color}40`,
          opacity: state === 'idle' ? 0.7 : 1,
        }}
      >
        {/* Inner glow */}
        <div
          className="absolute inset-2 rounded-full"
          style={{
            background: `radial-gradient(circle at 40% 40%, ${color}CC, transparent 70%)`,
            animation: 'pulseGlow 3s ease-in-out infinite',
          }}
        />

        {/* Scan line */}
        {state !== 'idle' && (
          <div
            className="absolute inset-0 rounded-full overflow-hidden animate-scan-line"
            style={{ opacity: 0.4 }}
          >
            <div
              className="absolute left-0 right-0 h-px"
              style={{ background: color, boxShadow: `0 0 10px ${color}` }}
            />
          </div>
        )}
      </div>

      {/* Status label */}
      <div
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-mono-display uppercase tracking-widest"
        style={{ color }}
      >
        {state === 'idle' && 'Standing By'}
        {state === 'listening' && 'Listening'}
        {state === 'processing' && 'Processing'}
        {state === 'speaking' && 'Speaking'}
      </div>
    </div>
  );
}

export function VoiceWaveform({ active, color = '#10b981' }: { active: boolean; color?: string }) {
  const bars = 5;
  return (
    <div className="flex items-center gap-1 h-4">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="w-0.5 rounded-full wave-bar"
          style={{
            height: '100%',
            background: color,
            transformOrigin: 'center',
            animationDelay: `${i * 0.12}s`,
            animationPlayState: active ? 'running' : 'paused',
            opacity: active ? 1 : 0.3,
            transform: active ? undefined : 'scaleY(0.2)',
          }}
        />
      ))}
    </div>
  );
}
