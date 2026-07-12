import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, Users, Plus, ChevronLeft, ChevronRight, Video } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CalendarEvent } from '../../types';
import { formatTime, formatDate, formatDuration, cn } from '../../lib/utils';

export function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .order('start_at', { ascending: true });
    setEvents((data || []) as CalendarEvent[]);
    setLoading(false);
  }

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + weekOffset * 7);
  weekStart.setHours(0, 0, 0, 0);

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const upcoming = events.filter((e) => new Date(e.start_at) >= new Date());
  const todayEvents = events.filter((e) => {
    const evDate = new Date(e.start_at);
    return evDate.toDateString() === today.toDateString();
  });

  if (loading) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading calendar...</div>;

  return (
    <div className="h-full flex overflow-hidden">
      {/* Calendar grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-5 border-b border-[#1a2845] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-200 font-mono-display">Calendar</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Week of {weekDays[0].toLocaleDateString([], { month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-2 rounded-lg bg-[#0f1830] border border-[#1a2845] text-slate-400 hover:text-cyan-300">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setWeekOffset(0)} className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
              Today
            </button>
            <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-2 rounded-lg bg-[#0f1830] border border-[#1a2845] text-slate-400 hover:text-cyan-300">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Week view */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, i) => {
              const dayEvents = events.filter((e) => new Date(e.start_at).toDateString() === day.toDateString());
              const isToday = day.toDateString() === today.toDateString();
              return (
                <div key={i} className={cn('panel p-3 min-h-[200px]', isToday && 'glow-border-cyan')}>
                  <div className={cn('text-xs font-mono-display mb-2', isToday ? 'text-cyan-400 font-bold' : 'text-slate-500')}>
                    <div className="uppercase">{day.toLocaleDateString([], { weekday: 'short' })}</div>
                    <div className={cn('text-lg', isToday && 'text-glow')}>{day.getDate()}</div>
                  </div>
                  <div className="space-y-1.5">
                    {dayEvents.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setSelected(e)}
                        className={cn(
                          'w-full text-left p-1.5 rounded text-[10px] transition-all hover:brightness-125',
                          selected?.id === e.id ? 'ring-1 ring-cyan-400' : '',
                        )}
                        style={{
                          background: `${e.color || '#3b82f6'}20`,
                          borderLeft: `2px solid ${e.color || '#3b82f6'}`,
                        }}
                      >
                        <div className="text-slate-200 font-medium truncate">{e.title}</div>
                        <div className="text-slate-500">{formatTime(e.start_at)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Event detail / today summary */}
      <div className="w-80 border-l border-[#1a2845] overflow-y-auto flex-shrink-0">
        {selected ? (
          <div className="p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-200">Event Details</h3>
              <button onClick={() => setSelected(null)} className="text-xs text-slate-500 hover:text-slate-300">Close</button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-6 rounded-full" style={{ background: selected.color || '#3b82f6' }} />
              <h4 className="text-base text-slate-200 font-medium">{selected.title}</h4>
            </div>
            <p className="text-sm text-slate-400 mb-4">{selected.description}</p>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-slate-300">{formatTime(selected.start_at)} — {formatTime(selected.end_at)}</span>
                <span className="text-xs text-slate-500">({formatDuration(selected.start_at, selected.end_at)})</span>
              </div>
              {selected.location && (
                <div className="flex items-center gap-2 text-sm">
                  {selected.location.toLowerCase().includes('zoom') ? <Video className="w-4 h-4 text-blue-400" /> : <MapPin className="w-4 h-4 text-slate-500" />}
                  <span className="text-slate-300">{selected.location}</span>
                </div>
              )}
              {selected.attendees.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm mb-1.5">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-300">{selected.attendees.length} attendee{selected.attendees.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="ml-6 space-y-1">
                    {selected.attendees.map((a) => (
                      <div key={a} className="text-xs text-slate-500">{a}</div>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-3 border-t border-[#1a2845]">
                <span className={cn(
                  'text-xs font-bold px-2 py-1 rounded',
                  selected.status === 'confirmed' ? 'bg-green-500/10 text-green-400' :
                  selected.status === 'tentative' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-red-500/10 text-red-400',
                )}>
                  {selected.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" /> Today's Agenda
            </h3>
            <div className="space-y-2">
              {todayEvents.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No events today</p>
              ) : (
                todayEvents.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setSelected(e)}
                    className="w-full text-left p-3 rounded-lg bg-[#0f1830] border border-[#1a2845] hover:border-cyan-500/20 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1 h-4 rounded-full" style={{ background: e.color || '#3b82f6' }} />
                      <span className="text-sm text-slate-200 truncate">{e.title}</span>
                    </div>
                    <span className="text-xs text-slate-500 ml-3">{formatTime(e.start_at)} — {formatTime(e.end_at)}</span>
                  </button>
                ))
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-[#1a2845]">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Upcoming</h4>
              <div className="space-y-2">
                {upcoming.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: e.color || '#3b82f6' }} />
                    <span className="text-slate-300 truncate flex-1">{e.title}</span>
                    <span className="text-slate-600 font-mono-display">{formatDate(e.start_at)}</span>
                  </div>
                ))}
              </div>
            </div>

            <button className="w-full mt-5 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 transition-all text-sm">
              <Plus className="w-4 h-4" /> New Event
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
