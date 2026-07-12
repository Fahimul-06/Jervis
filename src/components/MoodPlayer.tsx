import { useEffect, useState, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Music, Brain, Sparkles, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MoodMusicPlayer } from '../lib/musicPlayer';
import type { MusicMode, Mood } from '../lib/moodEngine';
import { MUSIC_MODE_NAMES, MOOD_NAMES, getMoodColor } from '../lib/moodEngine';
import { cn, formatRelativeTime } from '../lib/utils';

interface MoodEntry {
  id: string;
  mood: Mood;
  confidence: number;
  source: string;
  trigger_text: string | null;
  music_played: string | null;
  created_at: string;
}

interface MoodPlayerProps {
  currentMood: Mood | null;
  moodConfidence: number;
  musicMode: MusicMode;
  onMusicModeChange: (mode: MusicMode) => void;
}

export function MoodPlayer({ currentMood, moodConfidence, musicMode, onMusicModeChange }: MoodPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [muted, setMuted] = useState(false);
  const [history, setHistory] = useState<MoodEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const playerRef = useRef<MoodMusicPlayer | null>(null);

  useEffect(() => {
    playerRef.current = new MoodMusicPlayer((isPlaying: boolean, mode: MusicMode) => {
      setPlaying(isPlaying);
      if (mode !== musicMode) onMusicModeChange(mode);
    });
    loadHistory();

    return () => {
      playerRef.current?.dispose();
    };
  }, []);

  async function loadHistory() {
    const { data } = await supabase
      .from('mood_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(12);
    setHistory((data || []) as MoodEntry[]);
  }

  // Auto-play when mood changes (if not muted)
  useEffect(() => {
    if (!currentMood || !playerRef.current) return;
    if (muted) return;
    if (musicMode === 'silence') return;

    playerRef.current.play(musicMode);
  }, [musicMode, currentMood, muted]);

  function togglePlay() {
    if (!playerRef.current) return;
    if (playing) {
      playerRef.current.stop();
    } else {
      if (musicMode !== 'silence') {
        playerRef.current.play(musicMode);
      }
    }
  }

  function toggleMute() {
    if (muted) {
      setMuted(false);
      if (musicMode !== 'silence') playerRef.current?.play(musicMode);
    } else {
      setMuted(true);
      playerRef.current?.stop();
    }
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseFloat(e.target.value);
    setVolume(v);
    playerRef.current?.setVolume(v);
  }

  const moodColor = currentMood ? getMoodColor(currentMood) : '#64748b';
  const modeName = MUSIC_MODE_NAMES[musicMode];

  return (
    <>
      {/* Mini player bar — fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#1a2845] bg-[#0a1020]/95 backdrop-blur-md">
        <div className="flex items-center gap-4 px-4 py-2.5 max-w-6xl mx-auto">
          {/* Mood indicator */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className="relative w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: `${moodColor}20`, border: `1px solid ${moodColor}40` }}
            >
              <Brain className="w-4 h-4" style={{ color: moodColor }} />
              {playing && (
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: `${moodColor}20` }}
                />
              )}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs text-slate-500">Mood</div>
              <div className="text-xs font-mono-display font-bold" style={{ color: moodColor }}>
                {currentMood ? MOOD_NAMES[currentMood] : '—'}
                {currentMood && moodConfidence > 0 && ` (${Math.round(moodConfidence * 100)}%)`}
              </div>
            </div>
          </div>

          {/* Play/pause */}
          <button
            onClick={togglePlay}
            disabled={musicMode === 'silence'}
            className={cn(
              'p-2 rounded-lg transition-all flex-shrink-0',
              playing
                ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300'
                : 'bg-[#0f1830] border border-[#1a2845] text-slate-400 hover:text-cyan-300',
              musicMode === 'silence' && 'opacity-40 cursor-not-allowed',
            )}
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Music info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Music className={cn('w-3.5 h-3.5 flex-shrink-0', playing ? 'text-cyan-400 animate-pulse' : 'text-slate-600')} />
              <span className="text-sm text-slate-300 truncate">{modeName}</span>
              {playing && (
                <span className="flex items-center gap-0.5 ml-1">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="w-0.5 bg-cyan-400 rounded-full wave-bar"
                      style={{ height: '12px', animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </span>
              )}
            </div>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={toggleMute} className="p-1.5 text-slate-400 hover:text-cyan-300">
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 sm:w-24 accent-cyan-400 h-1"
            />
          </div>

          {/* History toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              'p-1.5 rounded-lg transition-colors flex-shrink-0',
              showHistory ? 'text-cyan-300 bg-cyan-500/10' : 'text-slate-400 hover:text-cyan-300',
            )}
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>

        {/* Equalizer bar animation */}
        {playing && (
          <div className="h-0.5 flex">
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 wave-bar"
                style={{
                  background: moodColor,
                  animationDelay: `${i * 0.03}s`,
                  animationDuration: `${0.6 + (i % 3) * 0.2}s`,
                  opacity: 0.6,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mood history dropdown */}
      {showHistory && (
        <div className="fixed bottom-16 right-4 w-80 panel z-40 animate-slide-up max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-[#1a2845]">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Brain className="w-4 h-4 text-cyan-400" /> Mood History
            </h3>
            <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-[#1a2845]">
            {history.length === 0 ? (
              <p className="text-center text-slate-500 py-6 text-sm">No mood data yet</p>
            ) : (
              history.map((entry) => {
                const color = getMoodColor(entry.mood);
                return (
                  <div key={entry.id} className="p-3 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="text-sm font-medium" style={{ color }}>
                        {MOOD_NAMES[entry.mood]}
                      </span>
                      <span className="text-[10px] text-slate-600 ml-auto font-mono-display">
                        {Math.round(entry.confidence * 100)}%
                      </span>
                      <span className="text-[10px] text-slate-600">{formatRelativeTime(entry.created_at)}</span>
                    </div>
                    {entry.trigger_text && (
                      <p className="text-xs text-slate-500 truncate italic">"{entry.trigger_text}"</p>
                    )}
                    {entry.music_played && (
                      <p className="text-[10px] text-cyan-600 mt-0.5 flex items-center gap-1">
                        <Music className="w-2.5 h-2.5" /> {MUSIC_MODE_NAMES[entry.music_played as MusicMode]}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
}
