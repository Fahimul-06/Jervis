import { useEffect, useState } from 'react';
import { Menu, Bell, Mic, MicOff, Volume2, VolumeX, Clock } from 'lucide-react';
import type { VoiceState } from '../hooks/useVoice';
import { VoiceWaveform } from './AIOrb';
import { cn } from '../lib/utils';

interface TopBarProps {
  voiceState: VoiceState;
  alwaysListening: boolean;
  onToggleListen: () => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  unreadCount: number;
  onBellClick: () => void;
  onToggleSidebar: () => void;
  title: string;
}

export function TopBar({
  voiceState,
  alwaysListening,
  onToggleListen,
  voiceEnabled,
  onToggleVoice,
  unreadCount,
  onBellClick,
  onToggleSidebar,
  title,
}: TopBarProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 border-b border-[#1a2845] bg-[#0a1020]/80 backdrop-blur-md flex items-center px-4 gap-4 flex-shrink-0 z-20">
      <button
        onClick={onToggleSidebar}
        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      <h1 className="text-sm font-mono-display text-slate-300 tracking-wide uppercase">{title}</h1>

      <div className="flex-1" />

      {/* Voice state indicator */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#0f1830] border border-[#1a2845]">
        {voiceState === 'listening' ? (
          <VoiceWaveform active color="#10b981" />
        ) : voiceState === 'speaking' ? (
          <VoiceWaveform active color="#f0b429" />
        ) : voiceState === 'processing' ? (
          <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-slate-600" />
        )}
        <span className="text-xs font-mono-display text-slate-400 capitalize hidden sm:inline">{voiceState}</span>
      </div>

      {/* Always-listen toggle */}
      <button
        onClick={onToggleListen}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm',
          alwaysListening
            ? 'bg-green-500/15 text-green-400 border border-green-500/30'
            : 'bg-[#0f1830] text-slate-400 border border-[#1a2845] hover:border-cyan-500/30',
        )}
        title={alwaysListening ? 'Always listening — click to pause' : 'Click to start listening'}
      >
        {alwaysListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        <span className="hidden md:inline">{alwaysListening ? 'Listening' : 'Mic Off'}</span>
      </button>

      {/* Voice output toggle */}
      <button
        onClick={onToggleVoice}
        className={cn(
          'p-1.5 rounded-lg transition-colors',
          voiceEnabled ? 'text-cyan-300 hover:bg-cyan-500/10' : 'text-slate-600 hover:bg-slate-700/30',
        )}
        title={voiceEnabled ? 'Voice responses on' : 'Voice responses off'}
      >
        {voiceEnabled ? <Volume2 className="w-[18px] h-[18px]" /> : <VolumeX className="w-[18px] h-[18px]" />}
      </button>

      {/* Notifications */}
      <button
        onClick={onBellClick}
        className="relative p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Clock */}
      <div className="flex items-center gap-2 text-xs font-mono-display text-slate-400 px-2">
        <Clock className="w-3.5 h-3.5" />
        <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
      </div>
    </header>
  );
}
