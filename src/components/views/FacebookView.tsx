import { useEffect, useState, useRef, useCallback } from 'react';
import { Send, Facebook, MessageCircle, ThumbsUp, Share2, Bot, RefreshCw, Zap, ChevronLeft, Users, FileText, Sparkles, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { FbConversation, FbMessage, FbPost, FbComment } from '../../types';
import { cn, formatRelativeTime, formatTime } from '../../lib/utils';

type Tab = 'messenger' | 'comments';

export function FacebookView() {
  const [tab, setTab] = useState<Tab>('messenger');
  const [conversations, setConversations] = useState<FbConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<FbConversation | null>(null);
  const [messages, setMessages] = useState<FbMessage[]>([]);
  const [posts, setPosts] = useState<FbPost[]>([]);
  const [comments, setComments] = useState<FbComment[]>([]);
  const [selectedPost, setSelectedPost] = useState<FbPost | null>(null);
  const [replyText, setReplyText] = useState('');
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    loadPosts();
  }, []);

  useEffect(() => {
    if (selectedConv) loadMessages(selectedConv.id);
  }, [selectedConv]);

  useEffect(() => {
    if (selectedPost) loadComments(selectedPost.id);
  }, [selectedPost]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadConversations() {
    const { data } = await supabase.from('fb_conversations').select('*').order('last_message_at', { ascending: false, nullsFirst: false });
    const typed = (data || []) as FbConversation[];
    setConversations(typed);
  }

  async function loadMessages(convId: string) {
    const { data } = await supabase
      .from('fb_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    setMessages((data || []) as FbMessage[]);
  }

  async function loadPosts() {
    const { data } = await supabase.from('fb_posts').select('*').order('posted_at', { ascending: false });
    setPosts((data || []) as FbPost[]);
  }

  async function loadComments(postId: string) {
    const { data } = await supabase
      .from('fb_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false });
    setComments((data || []) as FbComment[]);
  }

  async function sendMessage() {
    if (!replyText.trim() || !selectedConv) return;
    const msg: FbMessage = {
      id: crypto.randomUUID(),
      conversation_id: selectedConv.id,
      sender: 'user',
      content: replyText,
      is_read: true,
      auto_replied: false,
      mood_tag: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
    setReplyText('');

    await supabase.from('fb_messages').insert({
      conversation_id: selectedConv.id,
      sender: 'user',
      content: msg.content,
      is_read: true,
    });

    await supabase
      .from('fb_conversations')
      .update({ last_message_preview: msg.content, last_message_at: msg.created_at })
      .eq('id', selectedConv.id);
  }

  // Auto-detect and reply to unread messages
  const autoDetectAndReply = useCallback(async () => {
    setAutoDetecting(true);
    setScanResult(null);

    const { data: unreadConvs } = await supabase
      .from('fb_conversations')
      .select('*')
      .gt('unread_count', 0);

    const typedConvs = (unreadConvs || []) as FbConversation[];
    if (typedConvs.length === 0) {
      setScanResult('No unread messages found. All caught up!');
      setAutoDetecting(false);
      return;
    }

    let repliedCount = 0;
    for (const conv of typedConvs) {
      await new Promise((r) => setTimeout(r, 800));

      const { data: unreadMsgs } = await supabase
        .from('fb_messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .eq('is_read', false)
        .order('created_at', { ascending: true });

      const typedMsgs = (unreadMsgs || []) as FbMessage[];
      if (typedMsgs.length === 0) continue;

      const lastMsg = typedMsgs[typedMsgs.length - 1];
      const autoReply = generateAutoReply(lastMsg.content, conv.contact_name);

      const jarvisMsg: FbMessage = {
        id: crypto.randomUUID(),
        conversation_id: conv.id,
        sender: 'jarvis',
        content: autoReply,
        is_read: true,
        auto_replied: true,
        mood_tag: null,
        created_at: new Date().toISOString(),
      };

      await supabase.from('fb_messages').insert({
        conversation_id: conv.id,
        sender: 'jarvis',
        content: autoReply,
        is_read: true,
        auto_replied: true,
      });

      await supabase
        .from('fb_messages')
        .update({ is_read: true, auto_replied: true })
        .eq('conversation_id', conv.id)
        .eq('is_read', false);

      await supabase
        .from('fb_conversations')
        .update({ unread_count: 0, last_message_preview: autoReply, last_message_at: jarvisMsg.created_at })
        .eq('id', conv.id);

      repliedCount++;
      if (selectedConv?.id === conv.id) {
        setMessages((prev) => [...prev, jarvisMsg]);
      }
    }

    loadConversations();
    setScanResult(`Scanned ${typedConvs.length} conversations. Auto-replied to ${repliedCount} unread message${repliedCount !== 1 ? 's' : ''}.`);
    setAutoDetecting(false);
  }, [selectedConv]);

  async function toggleAutoReply(conv: FbConversation) {
    const newVal = !conv.auto_reply_enabled;
    await supabase.from('fb_conversations').update({ auto_reply_enabled: newVal }).eq('id', conv.id);
    setConversations((prev) => prev.map((c) => c.id === conv.id ? { ...c, auto_reply_enabled: newVal } : c));
  }

  async function postJarvisReply(comment: FbComment) {
    if (!comment.jarvis_reply) return;
    await supabase
      .from('fb_comments')
      .update({ reply_status: 'posted' })
      .eq('id', comment.id);
    setComments((prev) => prev.map((c) => c.id === comment.id ? { ...c, reply_status: 'posted' } : c));
  }

  async function ignoreComment(comment: FbComment) {
    await supabase
      .from('fb_comments')
      .update({ reply_status: 'ignored' })
      .eq('id', comment.id);
    setComments((prev) => prev.map((c) => c.id === comment.id ? { ...c, reply_status: 'ignored' } : c));
  }

  async function generateReply(comment: FbComment) {
    const reply = generateCommentReply(comment.content, comment.author_name, comment.sentiment);
    await supabase
      .from('fb_comments')
      .update({ jarvis_reply: reply, reply_status: 'suggested' })
      .eq('id', comment.id);
    setComments((prev) => prev.map((c) => c.id === comment.id ? { ...c, jarvis_reply: reply, reply_status: 'suggested' } : c));
  }

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const pendingComments = comments.filter((c) => c.reply_status === 'pending').length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1a2845] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/20">
            <Facebook className="w-5 h-5 text-[#1877F2]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-200">Facebook</h2>
            <p className="text-xs text-slate-500">
              {totalUnread} unread messages · {pendingComments} comments need replies
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 py-2 border-b border-[#1a2845] flex-shrink-0">
        <button
          onClick={() => setTab('messenger')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'messenger' ? 'bg-[#1877F2]/15 text-[#1877F2] border border-[#1877F2]/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
          )}
        >
          <MessageCircle className="w-4 h-4" />
          Messenger
          {totalUnread > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{totalUnread}</span>}
        </button>
        <button
          onClick={() => setTab('comments')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'comments' ? 'bg-[#1877F2]/15 text-[#1877F2] border border-[#1877F2]/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
          )}
        >
          <FileText className="w-4 h-4" />
          Post Comments
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'messenger' && (
          <div className="h-full flex">
            {/* Conversations list */}
            <div className={cn('border-r border-[#1a2845] flex flex-col', selectedConv ? 'w-64 hidden lg:flex' : 'w-full lg:w-80')}>
              <div className="p-3 border-b border-[#1a2845]">
                <button
                  onClick={autoDetectAndReply}
                  disabled={autoDetecting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 transition-all text-sm font-medium disabled:opacity-50"
                >
                  {autoDetecting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Scanning messages...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" /> Auto-detect & reply
                    </>
                  )}
                </button>
                {scanResult && (
                  <p className="text-[11px] text-cyan-400 mt-2 text-center animate-fade-in">{scanResult}</p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left border-b border-[#1a2845]/50 transition-all',
                      selectedConv?.id === conv.id ? 'bg-[#1877F2]/10' : 'hover:bg-white/5',
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={conv.contact_avatar || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop'}
                        alt={conv.contact_name}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      {conv.is_online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-[#070b16]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-200 truncate">{conv.contact_name}</span>
                        {conv.last_message_at && (
                          <span className="text-[10px] text-slate-600 flex-shrink-0 ml-2">{formatRelativeTime(conv.last_message_at)}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{conv.last_message_preview}</p>
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="bg-[#1877F2] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">{conv.unread_count}</span>
                    )}
                    {conv.auto_reply_enabled && (
                      <Bot className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat panel */}
            {selectedConv ? (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1a2845]">
                  <button onClick={() => setSelectedConv(null)} className="lg:hidden text-slate-400 hover:text-slate-200">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <img
                    src={selectedConv.contact_avatar || ''}
                    alt={selectedConv.contact_name}
                    className="w-9 h-9 rounded-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-200">{selectedConv.contact_name}</div>
                    <div className="text-[10px] text-slate-500">
                      {selectedConv.is_online ? 'Active now' : 'Offline'}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAutoReply(selectedConv)}
                    className={cn(
                      'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all',
                      selectedConv.auto_reply_enabled
                        ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300'
                        : 'bg-[#0f1830] border border-[#1a2845] text-slate-400 hover:text-slate-200',
                    )}
                  >
                    <Bot className="w-3.5 h-3.5" />
                    Auto-reply {selectedConv.auto_reply_enabled ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex gap-2 max-w-[75%]',
                        msg.sender === 'user' ? 'ml-auto flex-row-reverse' : '',
                      )}
                    >
                      {(msg.sender === 'contact' || msg.sender === 'jarvis') && (
                        <img
                          src={msg.sender === 'jarvis'
                            ? 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop'
                            : selectedConv.contact_avatar || ''}
                          alt={msg.sender}
                          className="w-7 h-7 rounded-full flex-shrink-0 object-cover mt-auto"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <div
                        className={cn(
                          'rounded-2xl px-3.5 py-2.5 text-sm',
                          msg.sender === 'user' && 'bg-[#1877F2] text-white rounded-br-sm',
                          msg.sender === 'contact' && 'bg-[#111a2e] text-slate-200 rounded-bl-sm',
                          msg.sender === 'jarvis' && 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 rounded-bl-sm',
                        )}
                      >
                        {msg.sender === 'jarvis' && (
                          <div className="flex items-center gap-1 mb-0.5 text-[10px] text-cyan-400 font-medium">
                            <Bot className="w-2.5 h-2.5" /> JERVIS auto-reply
                          </div>
                        )}
                        <p>{msg.content}</p>
                        <div className={cn('text-[9px] mt-1', msg.sender === 'user' ? 'text-blue-200' : 'text-slate-500')}>
                          {formatTime(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-3 border-t border-[#1a2845]">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 bg-[#0f1830] border border-[#1a2845] rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#1877F2]/40"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!replyText.trim()}
                      className="p-2.5 rounded-xl bg-[#1877F2] text-white hover:bg-[#1877F2]/80 transition-all disabled:opacity-40"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 hidden lg:flex items-center justify-center">
                <div className="text-center">
                  <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Select a conversation to view messages</p>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'comments' && (
          <div className="h-full flex">
            {/* Posts list */}
            <div className={cn('border-r border-[#1a2845] overflow-y-auto', selectedPost ? 'w-72 hidden lg:block' : 'w-full lg:w-96')}>
              {posts.map((post) => {
                const postComments = comments.filter((c) => c.post_id === post.id);
                const pending = postComments.filter((c) => c.reply_status === 'pending').length;
                return (
                  <button
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className={cn(
                      'w-full text-left p-4 border-b border-[#1a2845]/50 transition-all',
                      selectedPost?.id === post.id ? 'bg-[#1877F2]/10' : 'hover:bg-white/5',
                    )}
                  >
                    <p className="text-sm text-slate-300 line-clamp-2 mb-2">{post.content}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {post.likes}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {post.comments_count}</span>
                      <span className="flex items-center gap-1"><Share2 className="w-3 h-3" /> {post.shares}</span>
                      {pending > 0 && (
                        <span className="ml-auto text-amber-400 font-medium">{pending} need reply</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-600 mt-1 block">{formatRelativeTime(post.posted_at)}</span>
                  </button>
                );
              })}
            </div>

            {/* Comments detail */}
            {selectedPost ? (
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 border-b border-[#1a2845]">
                  <button onClick={() => setSelectedPost(null)} className="lg:hidden text-slate-400 hover:text-slate-200 mb-2">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <p className="text-sm text-slate-200">{selectedPost.content}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                    <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {selectedPost.likes} likes</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {selectedPost.comments_count} comments</span>
                  </div>
                </div>

                <div className="divide-y divide-[#1a2845]/50">
                  {comments.map((comment) => (
                    <div key={comment.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <img
                          src={comment.author_avatar || ''}
                          alt={comment.author_name}
                          className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-slate-200">{comment.author_name}</span>
                            <span className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                              comment.sentiment === 'positive' && 'bg-green-500/15 text-green-400',
                              comment.sentiment === 'negative' && 'bg-red-500/15 text-red-400',
                              comment.sentiment === 'question' && 'bg-amber-500/15 text-amber-400',
                              comment.sentiment === 'neutral' && 'bg-slate-500/15 text-slate-400',
                            )}>
                              {comment.sentiment}
                            </span>
                            <span className="text-[10px] text-slate-600 ml-auto">{formatRelativeTime(comment.created_at)}</span>
                          </div>
                          <p className="text-sm text-slate-300 mb-2">{comment.content}</p>

                          {comment.jarvis_reply && comment.reply_status !== 'ignored' && (
                            <div className={cn(
                              'rounded-lg p-3 mt-2 border',
                              comment.reply_status === 'posted'
                                ? 'bg-green-500/5 border-green-500/20'
                                : 'bg-cyan-500/5 border-cyan-500/20',
                            )}>
                              <div className="flex items-center gap-1.5 mb-1 text-[10px] font-medium">
                                {comment.reply_status === 'posted' ? (
                                  <span className="text-green-400 flex items-center gap-1"><Check className="w-3 h-3" /> Reply posted</span>
                                ) : (
                                  <span className="text-cyan-400 flex items-center gap-1"><Sparkles className="w-3 h-3" /> JERVIS suggested reply</span>
                                )}
                              </div>
                              <p className="text-sm text-slate-300">{comment.jarvis_reply}</p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-2">
                            {comment.reply_status === 'pending' && !comment.jarvis_reply && (
                              <button
                                onClick={() => generateReply(comment)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 transition-all flex items-center gap-1"
                              >
                                <Sparkles className="w-3 h-3" /> Generate reply
                              </button>
                            )}
                            {comment.reply_status === 'suggested' && (
                              <>
                                <button
                                  onClick={() => postJarvisReply(comment)}
                                  className="text-xs px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 hover:bg-green-500/20 transition-all flex items-center gap-1"
                                >
                                  <Send className="w-3 h-3" /> Post reply
                                </button>
                                <button
                                  onClick={() => ignoreComment(comment)}
                                  className="text-xs px-3 py-1.5 rounded-lg bg-[#0f1830] border border-[#1a2845] text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1"
                                >
                                  <X className="w-3 h-3" /> Ignore
                                </button>
                              </>
                            )}
                            {comment.reply_status === 'posted' && (
                              <span className="text-xs text-green-400 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Posted {formatRelativeTime(comment.created_at)}
                              </span>
                            )}
                            {comment.reply_status === 'ignored' && (
                              <span className="text-xs text-slate-600">Ignored</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 hidden lg:flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Select a post to view comments</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function generateAutoReply(message: string, contactName: string): string {
  const lower = message.toLowerCase();
  if (/^(hey|hi|hello|yo)/.test(lower)) {
    return `Hey ${contactName.split(' ')[0]}! Thanks for reaching out. I'll get back to you shortly. - JERVIS assisting`;
  }
  if (/\?$/.test(lower) || /what|when|where|how|can you|are we/i.test(lower)) {
    return `Thanks for the question! I saw your message and wanted to let you know I'll get back to you with a proper answer soon. - JERVIS assisting`;
  }
  if (/thanks|thank you|appreciate/i.test(lower)) {
    return `You're very welcome! Always happy to help. Talk soon!`;
  }
  if (/urgent|asap|emergency/i.test(lower)) {
    return `I see this is urgent. Flagging this as high priority — I'll respond as soon as possible. - JERVIS assisting`;
  }
  return `Thanks for your message! I've received it and will get back to you shortly. - JERVIS assisting`;
}

function generateCommentReply(_comment: string, authorName: string, sentiment: string | null): string {
  const firstName = authorName.split(' ')[0];
  if (sentiment === 'positive') {
    return `Thank you so much, ${firstName}! Really appreciate the kind words and support.`;
  }
  if (sentiment === 'negative') {
    return `Thanks for the honest feedback, ${firstName}. I hear you and I'm always working to improve. Happy to discuss further if you'd like.`;
  }
  if (sentiment === 'question') {
    return `Great question, ${firstName}! Happy to share more details. Feel free to DM me and I'll send you the full breakdown.`;
  }
  return `Thanks for engaging, ${firstName}! Glad you stopped by.`;
}
