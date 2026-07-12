import { useState, useCallback, useEffect, useRef } from 'react';
import type { Message, IntentResult, ViewKey, Notification } from './types';
import { supabase } from './lib/supabase';
import { parseIntent } from './lib/commandEngine';
import { executeCommand, logCommand, saveMessage } from './lib/dataActions';
import { useVoiceRecognition, useSpeechSynthesis } from './hooks/useVoice';
import { detectMood, getMoodResponse, type Mood, type MusicMode } from './lib/moodEngine';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ConfirmDialog } from './components/ConfirmDialog';
import { MoodPlayer } from './components/MoodPlayer';
import { StartupGate } from './components/views/StartupGate';
import { ChatView } from './components/views/ChatView';
import { DashboardView } from './components/views/DashboardView';
import { SystemHealthView } from './components/views/SystemHealthView';
import { FilesView } from './components/views/FilesView';
import { GitHubView } from './components/views/GitHubView';
import { EmailView } from './components/views/EmailView';
import { CalendarView } from './components/views/CalendarView';
import { IntegrationsView } from './components/views/IntegrationsView';
import { AutomationView } from './components/views/AutomationView';
import { HistoryView } from './components/views/HistoryView';
import { SettingsView } from './components/views/SettingsView';
import { FacebookView } from './components/views/FacebookView';
import { SpotifyView } from './components/views/SpotifyView';
import { DevicesView } from './components/views/DevicesView';

const VIEW_TITLES: Record<ViewKey, string> = {
  chat: 'JERVIS — Conversation',
  dashboard: 'Mission Control',
  system: 'System Health Monitor',
  files: 'File System',
  github: 'GitHub Repositories',
  email: 'Email Inbox',
  calendar: 'Calendar',
  integrations: 'Integrations',
  automation: 'Automation Rules',
  history: 'Command History',
  settings: 'Settings',
  facebook: 'Facebook',
  spotify: 'Spotify',
  devices: 'Connected Devices',
};

export default function App() {
  const [booted, setBooted] = useState(false);
  const [currentView, setCurrentView] = useState<ViewKey>('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Voice state
  const [alwaysListening, setAlwaysListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Mood state
  const [currentMood, setCurrentMood] = useState<Mood | null>(null);
  const [moodConfidence, setMoodConfidence] = useState(0);
  const [musicMode, setMusicMode] = useState<MusicMode>('silence');
  const [moodAnnounced, setMoodAnnounced] = useState(false);

  // Confirmation dialog state
  const [pendingCommand, setPendingCommand] = useState<{ text: string; intent: IntentResult } | null>(null);

  const { speak, stop: stopSpeaking } = useSpeechSynthesis();
  const messagesLoadedRef = useRef(false);

  const handleTranscript = useCallback((text: string) => {
    handleSend(text);
  }, []);

  const { state: voiceState, interimText, startListening, stopListening } = useVoiceRecognition(handleTranscript);

  // Load initial data
  useEffect(() => {
    if (!booted) return;
    loadMessages();
    loadNotifications();
  }, [booted]);

  useEffect(() => {
    if (messages.length > 0) messagesLoadedRef.current = true;
  }, [messages]);

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50);
    setMessages((data || []) as Message[]);
  }

  async function loadNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('read', false)
      .order('created_at', { ascending: false });
    setNotifications((data || []) as Notification[]);
  }

  async function markAllNotificationsRead() {
    await supabase.from('notifications').update({ read: true }).eq('read', false);
    setNotifications([]);
    setShowNotifications(false);
  }

  function updateMood(text: string, source: 'chat' | 'voice' = 'chat') {
    const result = detectMood(text, source);
    if (result.mood !== 'neutral' || !currentMood) {
      setCurrentMood(result.mood);
      setMoodConfidence(result.confidence);
      if (result.musicMode !== 'silence') {
        setMusicMode(result.musicMode);
      }

      // Save mood to DB
      supabase.from('mood_history').insert({
        mood: result.mood,
        confidence: result.confidence,
        source: result.source,
        trigger_text: result.triggerText,
        music_played: result.musicMode,
      }).then(() => {});

      // Announce mood change via voice once
      if (voiceEnabled && !moodAnnounced && result.mood !== 'neutral') {
        const moodMsg = getMoodResponse(result.mood);
        speak(moodMsg);
        setMoodAnnounced(true);
        setTimeout(() => setMoodAnnounced(false), 30000);
      }
    }
  }

  const handleSend = useCallback(async (text: string) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      intent: null,
      action_taken: null,
      confidence: 0,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);

    // Detect mood from user input
    updateMood(text, 'chat');

    const intent = parseIntent(text);
    userMsg.intent = intent.intent;

    await saveMessage('user', text, intent.intent, null, intent.confidence);

    if (intent.requiresConfirmation && !pendingCommand) {
      setThinking(false);
      setPendingCommand({ text, intent });
      return;
    }

    await processCommand(text, intent, false);
  }, [pendingCommand, voiceEnabled, moodAnnounced, currentMood]);

  async function processCommand(text: string, intent: IntentResult, confirmed: boolean) {
    setThinking(true);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));

    try {
      const result = await executeCommand(text, intent, confirmed);

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.response,
        intent: intent.intent,
        action_taken: result.actionTaken,
        confidence: intent.confidence,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      await saveMessage('assistant', result.response, intent.intent, result.actionTaken, intent.confidence);
      await logCommand(text, intent, result.actionTaken, result.success ? 'executed' : confirmed ? 'executed' : 'denied', confirmed, result.actionTaken);

      if (voiceEnabled) speak(result.response);

      if (result.navigateTo) {
        setTimeout(() => setCurrentView(result.navigateTo!), 1000);
      }
    } catch (err) {
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I encountered an error processing that request. Please try again.',
        intent: 'error',
        action_taken: null,
        confidence: 0,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      await logCommand(text, intent, 'Error during execution', 'failed', confirmed, String(err));
    } finally {
      setThinking(false);
    }
  }

  function handleConfirm() {
    if (!pendingCommand) return;
    const { text, intent } = pendingCommand;
    setPendingCommand(null);

    const confirmMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: `Confirmed: proceed with "${text}"`,
      intent: 'confirmation',
      action_taken: null,
      confidence: 1,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, confirmMsg]);
    processCommand(text, intent, true);
  }

  function handleDeny() {
    if (!pendingCommand) return;
    const { text, intent } = pendingCommand;
    setPendingCommand(null);

    const denyMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `Understood. I will not proceed with that action. Command "${text}" was denied.`,
      intent: intent.intent,
      action_taken: 'Action denied by user',
      confidence: 1,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, denyMsg]);
    logCommand(text, intent, 'User denied confirmation', 'denied', false, 'Confirmation denied');
    if (voiceEnabled) speak(denyMsg.content);
  }

  function handleToggleListen() {
    if (alwaysListening) {
      stopListening();
      stopSpeaking();
      setAlwaysListening(false);
    } else {
      startListening();
      setAlwaysListening(true);
    }
  }

  function handleToggleVoice() {
    if (voiceEnabled) {
      stopSpeaking();
      setVoiceEnabled(false);
    } else {
      setVoiceEnabled(true);
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!booted) {
    return <StartupGate onComplete={() => setBooted(true)} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050810]">
      <Sidebar
        current={currentView}
        onNavigate={setCurrentView}
        unreadNotifications={unreadCount}
        collapsed={sidebarCollapsed}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          voiceState={voiceState}
          alwaysListening={alwaysListening}
          onToggleListen={handleToggleListen}
          voiceEnabled={voiceEnabled}
          onToggleVoice={handleToggleVoice}
          unreadCount={unreadCount}
          onBellClick={() => setShowNotifications(!showNotifications)}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={VIEW_TITLES[currentView]}
        />

        {/* Bottom padding for mood player bar */}
        <div className="flex-1 overflow-hidden relative pb-12">
          {currentView === 'chat' && (
            <ChatView
              messages={messages}
              voiceState={voiceState}
              interimText={interimText}
              onSend={handleSend}
              thinking={thinking}
            />
          )}
          {currentView === 'dashboard' && <DashboardView onNavigate={setCurrentView} />}
          {currentView === 'system' && <SystemHealthView />}
          {currentView === 'files' && <FilesView />}
          {currentView === 'github' && <GitHubView />}
          {currentView === 'email' && <EmailView />}
          {currentView === 'calendar' && <CalendarView />}
          {currentView === 'integrations' && <IntegrationsView />}
          {currentView === 'automation' && <AutomationView />}
          {currentView === 'history' && <HistoryView />}
          {currentView === 'facebook' && <FacebookView />}
          {currentView === 'spotify' && <SpotifyView />}
          {currentView === 'devices' && <DevicesView />}
          {currentView === 'settings' && (
            <SettingsView
              alwaysListening={alwaysListening}
              onToggleListen={handleToggleListen}
              voiceEnabled={voiceEnabled}
              onToggleVoice={handleToggleVoice}
            />
          )}

          {/* Notifications dropdown */}
          {showNotifications && (
            <div className="absolute top-0 right-0 w-96 max-h-[70%] overflow-y-auto panel m-4 z-30 animate-slide-up">
              <div className="flex items-center justify-between p-4 border-b border-[#1a2845]">
                <h3 className="text-sm font-bold text-slate-200">Notifications</h3>
                <button onClick={markAllNotificationsRead} className="text-xs text-cyan-400 hover:text-cyan-300">
                  Mark all read
                </button>
              </div>
              <div className="divide-y divide-[#1a2845]">
                {notifications.length === 0 ? (
                  <p className="text-center text-slate-500 py-8 text-sm">No unread notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-3 hover:bg-white/5 transition-colors">
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          n.severity === 'error' ? 'bg-red-400' :
                          n.severity === 'warning' ? 'bg-amber-400' :
                          n.severity === 'success' ? 'bg-green-400' : 'bg-cyan-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-200">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                          {n.action_url && (
                            <button
                              onClick={() => { if (n.action_url) { setCurrentView(n.action_url.slice(1) as ViewKey); setShowNotifications(false); } }}
                              className="text-xs text-cyan-400 hover:text-cyan-300 mt-1"
                            >
                              View →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Confirmation dialog */}
          {pendingCommand && (
            <ConfirmDialog
              intent={pendingCommand.intent}
              command={pendingCommand.text}
              onConfirm={handleConfirm}
              onDeny={handleDeny}
            />
          )}
        </div>
      </div>

      {/* Mood-aware music player (fixed bottom bar) */}
      <MoodPlayer
        currentMood={currentMood}
        moodConfidence={moodConfidence}
        musicMode={musicMode}
        onMusicModeChange={setMusicMode}
      />
    </div>
  );
}
