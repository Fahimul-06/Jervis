export type ViewKey =
  | 'chat'
  | 'dashboard'
  | 'system'
  | 'files'
  | 'github'
  | 'email'
  | 'calendar'
  | 'integrations'
  | 'automation'
  | 'history'
  | 'settings'
  | 'facebook'
  | 'spotify'
  | 'devices';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent: string | null;
  action_taken: string | null;
  confidence: number;
  created_at: string;
}

export interface CommandLogEntry {
  id: string;
  command: string;
  intent: string | null;
  action: string | null;
  status: 'pending' | 'executed' | 'denied' | 'failed';
  risk_level: 'safe' | 'moderate' | 'sensitive' | 'destructive';
  confirmed: boolean;
  detail: string | null;
  created_at: string;
}

export interface Reminder {
  id: string;
  title: string;
  description: string | null;
  due_at: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  snoozed_until: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  source: 'system' | 'email' | 'calendar' | 'github' | 'automation' | 'reminder';
  title: string;
  body: string | null;
  severity: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  action_url: string | null;
  created_at: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger_type: 'schedule' | 'event' | 'command_keyword';
  trigger_config: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  enabled: boolean;
  last_run_at: string | null;
  run_count: number;
  created_at: string;
}

export interface Integration {
  id: string;
  service: string;
  display_name: string;
  status: 'connected' | 'disconnected' | 'error';
  config: Record<string, unknown>;
  last_synced_at: string | null;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  attendees: string[];
  status: 'confirmed' | 'tentative' | 'cancelled';
  color: string | null;
  created_at: string;
}

export interface Email {
  id: string;
  from_address: string;
  from_name: string | null;
  subject: string;
  preview: string | null;
  body: string | null;
  folder: 'inbox' | 'starred' | 'sent' | 'drafts' | 'archive' | 'trash';
  is_read: boolean;
  is_starred: boolean;
  labels: string[];
  priority_score: number;
  received_at: string;
  created_at: string;
}

export interface GithubRepo {
  id: string;
  name: string;
  full_name: string | null;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  open_issues: number;
  default_branch: string;
  url: string | null;
  last_commit_message: string | null;
  last_commit_at: string | null;
  health_status: 'healthy' | 'warning' | 'critical';
  created_at: string;
}

export interface FileEntry {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  parent_path: string | null;
  size_bytes: number;
  mime_type: string | null;
  modified_at: string;
  content_preview: string | null;
  tags: string[];
  created_at: string;
}

export interface SystemMetric {
  id: string;
  recorded_at: string;
  cpu_percent: number;
  memory_percent: number;
  memory_used_gb: number;
  disk_percent: number;
  network_down_mbps: number;
  network_up_mbps: number;
  battery_percent: number | null;
  uptime_hours: number;
  process_count: number;
  temperature_c: number | null;
}

export type RiskLevel = 'safe' | 'moderate' | 'sensitive' | 'destructive';

export interface IntentResult {
  intent: string;
  confidence: number;
  riskLevel: RiskLevel;
  actionDescription: string;
  requiresConfirmation: boolean;
  category: string;
}

export interface CommandResult {
  intent: IntentResult;
  response: string;
  actionTaken: string;
  success: boolean;
  navigateTo?: ViewKey;
}

export interface FbConversation {
  id: string;
  contact_name: string;
  contact_avatar: string | null;
  contact_id: string | null;
  unread_count: number;
  last_message_preview: string | null;
  last_message_at: string | null;
  auto_reply_enabled: boolean;
  is_online: boolean;
  created_at: string;
}

export interface FbMessage {
  id: string;
  conversation_id: string;
  sender: 'user' | 'contact' | 'jarvis';
  content: string;
  is_read: boolean;
  auto_replied: boolean;
  mood_tag: string | null;
  created_at: string;
}

export interface FbPost {
  id: string;
  content: string;
  post_type: 'text' | 'photo' | 'link' | 'video';
  likes: number;
  comments_count: number;
  shares: number;
  posted_at: string;
  created_at: string;
}

export interface FbComment {
  id: string;
  post_id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  likes: number;
  sentiment: 'positive' | 'neutral' | 'negative' | 'question' | null;
  jarvis_reply: string | null;
  reply_status: 'pending' | 'suggested' | 'posted' | 'ignored';
  created_at: string;
}

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  duration_ms: number | null;
  spotify_id: string | null;
  preview_url: string | null;
  album_art: string | null;
  popularity: number | null;
  mood_tag: string | null;
  is_playing: boolean;
  is_favorite: boolean;
  created_at: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  track_count: number;
  cover_color: string;
  spotify_playlist_id: string | null;
  created_at: string;
}

export type DeviceType = 'phone' | 'laptop' | 'desktop' | 'tablet' | 'watch' | 'tv' | 'iot' | 'server';
export type DeviceStatus = 'online' | 'offline' | 'pairing' | 'restricted';
export type AccessLevel = 'full' | 'limited' | 'view_only' | 'revoked';

export interface DeviceCapabilities {
  microphone: boolean;
  filesystem: boolean;
  screen: boolean;
  camera: boolean;
  notifications: boolean;
  system_control: boolean;
  network: boolean;
  location: boolean;
  bluetooth: boolean;
  sms: boolean;
  contacts: boolean;
  calendar: boolean;
}

export interface ConnectedDevice {
  id: string;
  device_name: string;
  device_type: DeviceType;
  os: string | null;
  os_version: string | null;
  hostname: string | null;
  ip_address: string | null;
  mac_address: string | null;
  status: DeviceStatus;
  access_level: AccessLevel;
  battery_percent: number | null;
  location: string | null;
  last_seen: string | null;
  paired_at: string;
  capabilities: DeviceCapabilities;
  storage_total_gb: number | null;
  storage_used_gb: number | null;
  cpu_percent: number | null;
  memory_total_gb: number | null;
  memory_used_gb: number | null;
  installed_apps: number;
  is_primary: boolean;
  created_at: string;
}

export interface DeviceAccessLog {
  id: string;
  device_id: string;
  action: string;
  capability: string | null;
  details: string | null;
  status: 'success' | 'failed' | 'denied' | 'pending';
  created_at: string;
}
