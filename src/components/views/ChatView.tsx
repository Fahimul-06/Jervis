import { useEffect, useRef, useState, useCallback } from 'react';
import { Send, Sparkles, User, Cpu, ArrowRight } from 'lucide-react';
import type { Message } from '../../types';
import { AIOrb, VoiceWaveform } from '../AIOrb';
import { QUICK_COMMANDS, SUGGESTIONS } from '../../lib/commandEngine';
import { cn, formatRelativeTime } from '../../lib/utils';
import type { VoiceState } from '../../hooks/useVoice';

interface ChatViewProps {
  messages: Message[];
  voiceState: VoiceState;
  interimText: string;
  onSend: (text: string) => void;
  thinking: boolean;
}

function renderContent(content: string) {
  return content.split('\n').map((line, i) => {
    if (line.startsWith('• ') || line.startsWith('•**')) {
      return (
        <div key={i} className="flex gap-2 my-0.5">
          <span className="text-cyan-400 mt-0.5">•</span>
          <span dangerouslySetInnerHTML={{ __html: line.replace(/•\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-300">$1</strong>') }} />
        </div>
      );
    }
    if (line.startsWith('**') && line.endsWith('**')) {
      return <div key={i} className="font-bold text-cyan-300 my-1" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '$1') }} />;
    }
    if (line.trim() === '') return <div key={i} className="h-2" />;
    return (
      <div key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-300">$1</strong>') }} />
    );
  });
}

export function ChatView({ messages, voiceState, interimText, onSend, thinking }: ChatViewProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking, interimText]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input.trim());
      setInput('');
    }
  }, [input, onSend]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4 grid-bg">
        <div className="max-w-3xl mx-auto w-full">
          {/* Orb header */}
          <div className="flex flex-col items-center mb-8 mt-2">
            <AIOrb state={voiceState} size={140} />
            <p className="text-xs text-slate-500 mt-8 font-mono-display max-w-md text-center">
              Always listening. Talk to me naturally — I can see your system, files, email, calendar, and GitHub.
            </p>
          </div>

          {messages.length === 0 && (
            <div className="text-center text-slate-500 py-8">
              <p className="text-sm">Start a conversation or use the quick actions below.</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn('flex gap-3 mb-4 animate-slide-up', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
            >
              <div
                className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                  msg.role === 'user'
                    ? 'bg-blue-500/20 border border-blue-500/30'
                    : 'bg-cyan-500/20 border border-cyan-500/30',
                )}
              >
                {msg.role === 'user' ? (
                  <User className="w-4 h-4 text-blue-300" />
                ) : (
                  <Cpu className="w-4 h-4 text-cyan-300" />
                )}
              </div>

              <div className={cn('max-w-[75%]', msg.role === 'user' && 'flex flex-col items-end')}>
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-blue-500/10 border border-blue-500/20 text-slate-200 rounded-tr-sm'
                      : 'bg-[#0f1830] border border-[#1a2845] text-slate-200 rounded-tl-sm',
                  )}
                >
                  <div className="space-y-0.5">{renderContent(msg.content)}</div>
                </div>
                <div className="flex items-center gap-2 mt-1 px-1">
                  <span className="text-[10px] text-slate-600 font-mono-display">{formatRelativeTime(msg.created_at)}</span>
                  {msg.intent && msg.intent !== 'unknown' && (
                    <span className="text-[10px] text-cyan-600 font-mono-display">[{msg.intent}]</span>
                  )}
                  {msg.action_taken && msg.role === 'assistant' && (
                    <span className="text-[10px] text-slate-600 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> {msg.action_taken}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {thinking && (
            <div className="flex gap-3 mb-4 animate-fade-in">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-cyan-300 animate-pulse" />
              </div>
              <div className="bg-[#0f1830] border border-[#1a2845] rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-cyan-400 font-mono-display">Processing</span>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Interim voice text */}
          {interimText && (
            <div className="flex gap-3 mb-4 flex-row-reverse opacity-60">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-300" />
              </div>
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl rounded-tr-sm px-4 py-3 text-sm italic text-slate-400">
                {interimText}...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions + suggestions */}
      <div className="px-6 py-3 border-t border-[#1a2845] bg-[#0a1020]/50">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_COMMANDS.map((qc) => (
              <button
                key={qc.label}
                onClick={() => onSend(qc.command)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[#0f1830] border border-[#1a2845] text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 transition-all"
              >
                {qc.label}
                <ArrowRight className="w-3 h-3" />
              </button>
            ))}
          </div>

          {/* Suggestions ticker */}
          <div className="flex items-center gap-2 text-xs text-slate-500 overflow-hidden">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="truncate">{SUGGESTIONS[new Date().getSeconds() % SUGGESTIONS.length]}</span>
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type or speak your command..."
                className="w-full bg-[#0f1830] border border-[#1a2845] rounded-xl px-4 py-3 pr-12 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              />
              {voiceState === 'listening' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <VoiceWaveform active color="#10b981" />
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 hover:border-cyan-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
