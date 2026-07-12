import { useEffect, useState } from 'react';
import {
  Mail, Star, Inbox, Send, FileEdit, Archive, Trash2,
  AlertCircle, Reply, Forward, User,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Email } from '../../types';
import { formatRelativeTime, cn } from '../../lib/utils';

type Folder = 'inbox' | 'starred' | 'sent' | 'drafts' | 'archive' | 'trash';

const FOLDERS: { key: Folder; label: string; icon: typeof Inbox }[] = [
  { key: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'starred', label: 'Starred', icon: Star },
  { key: 'sent', label: 'Sent', icon: Send },
  { key: 'drafts', label: 'Drafts', icon: FileEdit },
  { key: 'archive', label: 'Archive', icon: Archive },
  { key: 'trash', label: 'Trash', icon: Trash2 },
];

export function EmailView() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [folder, setFolder] = useState<Folder>('inbox');
  const [selected, setSelected] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadEmails(folder);
  }, [folder]);

  async function loadEmails(f: Folder) {
    setLoading(true);
    let query = supabase.from('emails').select('*').order('received_at', { ascending: false });
    if (f === 'starred') query = query.eq('is_starred', true);
    else query = query.eq('folder', f);
    const { data } = await query;
    setEmails((data || []) as Email[]);
    setLoading(false);

    // Load unread counts
    const { count: inboxUnread } = await supabase
      .from('emails').select('*', { count: 'exact', head: true })
      .eq('folder', 'inbox').eq('is_read', false);
    setUnreadCounts({ inbox: inboxUnread || 0 });
  }

  async function markRead(email: Email) {
    setSelected(email);
    if (!email.is_read) {
      await supabase.from('emails').update({ is_read: true }).eq('id', email.id);
      setEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, is_read: true } : e));
    }
  }

  async function toggleStar(email: Email) {
    const updated = !email.is_starred;
    await supabase.from('emails').update({ is_starred: updated }).eq('id', email.id);
    setEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, is_starred: updated } : e));
    if (selected?.id === email.id) setSelected({ ...email, is_starred: updated });
  }

  if (loading && emails.length === 0) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading emails...</div>;

  return (
    <div className="h-full flex overflow-hidden">
      {/* Folders sidebar */}
      <div className="w-48 border-r border-[#1a2845] flex-shrink-0 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-sm font-bold text-slate-200 font-mono-display mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-amber-400" /> Mail
          </h2>
          <div className="space-y-1">
            {FOLDERS.map((f) => {
              const Icon = f.icon;
              const active = folder === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => { setFolder(f.key); setSelected(null); }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                    active ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'text-slate-400 hover:bg-white/5',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{f.label}</span>
                  {f.key === 'inbox' && unreadCounts.inbox > 0 && (
                    <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unreadCounts.inbox}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Email list */}
      <div className="w-96 border-r border-[#1a2845] flex-shrink-0 overflow-y-auto">
        {emails.length === 0 ? (
          <div className="text-center text-slate-500 py-12 text-sm">No emails in {folder}</div>
        ) : (
          <div className="divide-y divide-[#1a2845]">
            {emails.map((email) => (
              <button
                key={email.id}
                onClick={() => markRead(email)}
                className={cn(
                  'w-full text-left p-4 transition-all hover:bg-white/5',
                  selected?.id === email.id && 'bg-amber-500/5 border-l-2 border-amber-400',
                  !email.is_read && 'bg-cyan-500/5',
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {!email.is_read && <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />}
                    <span className={cn('text-sm truncate', email.is_read ? 'text-slate-400' : 'text-slate-200 font-medium')}>
                      {email.from_name || email.from_address}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-600 flex-shrink-0">{formatRelativeTime(email.received_at)}</span>
                </div>
                <p className={cn('text-sm truncate', email.is_read ? 'text-slate-400' : 'text-slate-200 font-medium')}>
                  {email.subject}
                </p>
                <p className="text-xs text-slate-500 truncate mt-1">{email.preview}</p>
                <div className="flex items-center gap-2 mt-2">
                  {email.priority_score > 80 && (
                    <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <AlertCircle className="w-2.5 h-2.5" /> URGENT
                    </span>
                  )}
                  {email.is_starred && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                  {email.labels.includes('work') && <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">work</span>}
                  {email.labels.includes('github') && <span className="text-[9px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">github</span>}
                  {email.labels.includes('system') && <span className="text-[9px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">system</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Email detail */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <div className="p-6 max-w-3xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-200">{selected.subject}</h2>
              <div className="flex gap-2">
                <button onClick={() => toggleStar(selected)} className="p-2 rounded-lg bg-[#0f1830] border border-[#1a2845] text-slate-400 hover:text-amber-400">
                  <Star className={cn('w-4 h-4', selected.is_starred && 'fill-amber-400 text-amber-400')} />
                </button>
                <button className="p-2 rounded-lg bg-[#0f1830] border border-[#1a2845] text-slate-400 hover:text-cyan-300">
                  <Reply className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-lg bg-[#0f1830] border border-[#1a2845] text-slate-400 hover:text-cyan-300">
                  <Forward className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 pb-4 border-b border-[#1a2845] mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-blue-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-200 font-medium">{selected.from_name || selected.from_address}</p>
                <p className="text-xs text-slate-500">{selected.from_address}</p>
              </div>
              <span className="text-xs text-slate-500">{formatRelativeTime(selected.received_at)}</span>
            </div>

            {selected.priority_score > 80 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <p className="text-xs text-red-300">JERVIS flagged this as high priority based on sender and content analysis.</p>
              </div>
            )}

            <div className="bg-[#0f1830] border border-[#1a2845] rounded-lg p-5 text-sm text-slate-300 leading-relaxed">
              {selected.body || selected.preview}
            </div>

            {/* JERVIS suggested actions */}
            <div className="mt-5 panel p-4">
              <p className="text-xs text-cyan-400 font-mono-display mb-2">JERVIS SUGGESTED ACTIONS</p>
              <div className="flex flex-wrap gap-2">
                <button className="text-xs px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20">
                  Draft a reply
                </button>
                <button className="text-xs px-3 py-1.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-300 hover:bg-slate-500/20">
                  Archive
                </button>
                <button className="text-xs px-3 py-1.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-300 hover:bg-slate-500/20">
                  Create reminder
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            Select an email to read
          </div>
        )}
      </div>
    </div>
  );
}
