/*
# JERVIS AI Assistant - Initial Schema

JERVIS is an AI personal assistant (single-tenant, no auth) that manages
files, projects, emails, calendar, GitHub, system health, automation, and
provides a conversational chat interface with voice support.

## 1. New Tables

- `messages`: Chat conversation history between the user and JERVIS.
  - `id` (uuid, PK)
  - `role` (text: 'user' | 'assistant')
  - `content` (text, the message body)
  - `intent` (text, detected intent tag, nullable)
  - `action_taken` (text, summary of action executed, nullable)
  - `confidence` (numeric 0-1, intent confidence)
  - `created_at` (timestamptz)

- `command_log`: Audit log of every action JERVIS takes.
  - `id` (uuid, PK)
  - `command` (text, original user command)
  - `intent` (text, parsed intent)
  - `action` (text, action performed)
  - `status` (text: 'pending' | 'executed' | 'denied' | 'failed')
  - `risk_level` (text: 'safe' | 'moderate' | 'sensitive' | 'destructive')
  - `confirmed` (boolean, whether user confirmed)
  - `detail` (text, additional info/errors, nullable)
  - `created_at` (timestamptz)

- `reminders`: User reminders and follow-ups.
  - `id` (uuid, PK)
  - `title` (text)
  - `description` (text, nullable)
  - `due_at` (timestamptz, when reminder fires)
  - `priority` (text: 'low' | 'medium' | 'high')
  - `completed` (boolean, default false)
  - `snoozed_until` (timestamptz, nullable)
  - `created_at` (timestamptz)

- `notifications`: Notification feed.
  - `id` (uuid, PK)
  - `source` (text: 'system' | 'email' | 'calendar' | 'github' | 'automation' | 'reminder')
  - `title` (text)
  - `body` (text, nullable)
  - `severity` (text: 'info' | 'warning' | 'error' | 'success')
  - `read` (boolean, default false)
  - `action_url` (text, nullable)
  - `created_at` (timestamptz)

- `automation_rules`: User-defined automation rules (trigger -> action).
  - `id` (uuid, PK)
  - `name` (text)
  - `trigger_type` (text: 'schedule' | 'event' | 'command_keyword')
  - `trigger_config` (jsonb, trigger parameters)
  - `action_type` (text, what JERVIS does)
  - `action_config` (jsonb, action parameters)
  - `enabled` (boolean, default true)
  - `last_run_at` (timestamptz, nullable)
  - `run_count` (int, default 0)
  - `created_at` (timestamptz)

- `integrations`: Connection status for external services.
  - `id` (uuid, PK)
  - `service` (text, unique: 'github' | 'email' | 'calendar' | 'slack' | 'twitter' | 'filesystem')
  - `display_name` (text)
  - `status` (text: 'connected' | 'disconnected' | 'error')
  - `config` (jsonb, non-secret config)
  - `last_synced_at` (timestamptz, nullable)
  - `created_at` (timestamptz)

- `calendar_events`: Calendar events.
  - `id` (uuid, PK)
  - `title` (text)
  - `description` (text, nullable)
  - `location` (text, nullable)
  - `start_at` (timestamptz)
  - `end_at` (timestamptz)
  - `attendees` (text[], default '{}')
  - `status` (text: 'confirmed' | 'tentative' | 'cancelled')
  - `color` (text, nullable)
  - `created_at` (timestamptz)

- `emails`: Email inbox simulation for triage.
  - `id` (uuid, PK)
  - `from_address` (text)
  - `from_name` (text, nullable)
  - `subject` (text)
  - `preview` (text, nullable)
  - `body` (text, nullable)
  - `folder` (text: 'inbox' | 'starred' | 'sent' | 'drafts' | 'archive' | 'trash')
  - `is_read` (boolean, default false)
  - `is_starred` (boolean, default false)
  - `labels` (text[], default '{}')
  - `priority_score` (numeric, default 0)
  - `received_at` (timestamptz)
  - `created_at` (timestamptz)

- `github_repos`: GitHub repository tracking.
  - `id` (uuid, PK)
  - `name` (text)
  - `full_name` (text, nullable)
  - `description` (text, nullable)
  - `language` (text, nullable)
  - `stars` (int, default 0)
  - `forks` (int, default 0)
  - `open_issues` (int, default 0)
  - `default_branch` (text, default 'main')
  - `url` (text, nullable)
  - `last_commit_message` (text, nullable)
  - `last_commit_at` (timestamptz, nullable)
  - `health_status` (text: 'healthy' | 'warning' | 'critical')
  - `created_at` (timestamptz)

- `file_entries`: Simulated file system entries.
  - `id` (uuid, PK)
  - `name` (text)
  - `path` (text, full path)
  - `type` (text: 'file' | 'folder')
  - `parent_path` (text, nullable)
  - `size_bytes` (bigint, default 0)
  - `mime_type` (text, nullable)
  - `modified_at` (timestamptz)
  - `content_preview` (text, nullable)
  - `tags` (text[], default '{}')
  - `created_at` (timestamptz)

- `system_metrics`: Time-series system health snapshots.
  - `id` (uuid, PK)
  - `recorded_at` (timestamptz)
  - `cpu_percent` (numeric)
  - `memory_percent` (numeric)
  - `memory_used_gb` (numeric)
  - `disk_percent` (numeric)
  - `network_down_mbps` (numeric)
  - `network_up_mbps` (numeric)
  - `battery_percent` (int, nullable)
  - `uptime_hours` (numeric)
  - `process_count` (int)
  - `temperature_c` (numeric, nullable)

## 2. Security (RLS)
- All tables are single-tenant (no auth). RLS enabled on every table.
- Policies allow anon + authenticated full CRUD since data is intentionally
  shared/public (the assistant serves one operator).

## 3. Indexes
- `messages` created_at DESC
- `command_log` created_at DESC
- `notifications` (read, created_at DESC)
- `reminders` (completed, due_at)
- `calendar_events` start_at
- `emails` (folder, received_at DESC)
- `file_entries` path (unique)
- `system_metrics` recorded_at DESC
*/

-- ============ messages ============
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  intent text,
  action_taken text,
  confidence numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_messages" ON messages;
CREATE POLICY "anon_select_messages" ON messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_messages" ON messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_messages" ON messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_messages" ON messages FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at DESC);

-- ============ command_log ============
CREATE TABLE IF NOT EXISTS command_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command text NOT NULL,
  intent text,
  action text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','executed','denied','failed')),
  risk_level text NOT NULL DEFAULT 'safe' CHECK (risk_level IN ('safe','moderate','sensitive','destructive')),
  confirmed boolean NOT NULL DEFAULT false,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE command_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_command_log" ON command_log;
CREATE POLICY "anon_select_command_log" ON command_log FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_command_log" ON command_log FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_command_log" ON command_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_command_log" ON command_log FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_command_log_created_at ON command_log (created_at DESC);

-- ============ reminders ============
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  due_at timestamptz NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  completed boolean NOT NULL DEFAULT false,
  snoozed_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_reminders" ON reminders;
CREATE POLICY "anon_select_reminders" ON reminders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_reminders" ON reminders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_reminders" ON reminders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_reminders" ON reminders FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders (completed, due_at);

-- ============ notifications ============
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('system','email','calendar','github','automation','reminder')),
  title text NOT NULL,
  body text,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','error','success')),
  read boolean NOT NULL DEFAULT false,
  action_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
CREATE POLICY "anon_select_notifications" ON notifications FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_notifications" ON notifications FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_notifications" ON notifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_notifications" ON notifications FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (read, created_at DESC);

-- ============ automation_rules ============
CREATE TABLE IF NOT EXISTS automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('schedule','event','command_keyword')),
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_type text NOT NULL,
  action_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  run_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_automation_rules" ON automation_rules;
CREATE POLICY "anon_select_automation_rules" ON automation_rules FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_automation_rules" ON automation_rules FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_automation_rules" ON automation_rules FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_automation_rules" ON automation_rules FOR DELETE TO anon, authenticated USING (true);

-- ============ integrations ============
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text UNIQUE NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected','disconnected','error')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_integrations" ON integrations;
CREATE POLICY "anon_select_integrations" ON integrations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_integrations" ON integrations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_integrations" ON integrations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_integrations" ON integrations FOR DELETE TO anon, authenticated USING (true);

-- ============ calendar_events ============
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  location text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  attendees text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','tentative','cancelled')),
  color text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_calendar_events" ON calendar_events;
CREATE POLICY "anon_select_calendar_events" ON calendar_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_calendar_events" ON calendar_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_calendar_events" ON calendar_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_calendar_events" ON calendar_events FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_calendar_start ON calendar_events (start_at);

-- ============ emails ============
CREATE TABLE IF NOT EXISTS emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_address text NOT NULL,
  from_name text,
  subject text NOT NULL,
  preview text,
  body text,
  folder text NOT NULL DEFAULT 'inbox' CHECK (folder IN ('inbox','starred','sent','drafts','archive','trash')),
  is_read boolean NOT NULL DEFAULT false,
  is_starred boolean NOT NULL DEFAULT false,
  labels text[] NOT NULL DEFAULT '{}',
  priority_score numeric NOT NULL DEFAULT 0,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_emails" ON emails;
CREATE POLICY "anon_select_emails" ON emails FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_emails" ON emails FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_emails" ON emails FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_emails" ON emails FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_emails_folder ON emails (folder, received_at DESC);

-- ============ github_repos ============
CREATE TABLE IF NOT EXISTS github_repos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  full_name text,
  description text,
  language text,
  stars int NOT NULL DEFAULT 0,
  forks int NOT NULL DEFAULT 0,
  open_issues int NOT NULL DEFAULT 0,
  default_branch text NOT NULL DEFAULT 'main',
  url text,
  last_commit_message text,
  last_commit_at timestamptz,
  health_status text NOT NULL DEFAULT 'healthy' CHECK (health_status IN ('healthy','warning','critical')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE github_repos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_github_repos" ON github_repos;
CREATE POLICY "anon_select_github_repos" ON github_repos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_github_repos" ON github_repos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_github_repos" ON github_repos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_github_repos" ON github_repos FOR DELETE TO anon, authenticated USING (true);

-- ============ file_entries ============
CREATE TABLE IF NOT EXISTS file_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  path text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('file','folder')),
  parent_path text,
  size_bytes bigint NOT NULL DEFAULT 0,
  mime_type text,
  modified_at timestamptz NOT NULL DEFAULT now(),
  content_preview text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE file_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_file_entries" ON file_entries;
CREATE POLICY "anon_select_file_entries" ON file_entries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_file_entries" ON file_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_file_entries" ON file_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_file_entries" ON file_entries FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_file_entries_parent ON file_entries (parent_path);

-- ============ system_metrics ============
CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  cpu_percent numeric NOT NULL DEFAULT 0,
  memory_percent numeric NOT NULL DEFAULT 0,
  memory_used_gb numeric NOT NULL DEFAULT 0,
  disk_percent numeric NOT NULL DEFAULT 0,
  network_down_mbps numeric NOT NULL DEFAULT 0,
  network_up_mbps numeric NOT NULL DEFAULT 0,
  battery_percent int,
  uptime_hours numeric NOT NULL DEFAULT 0,
  process_count int NOT NULL DEFAULT 0,
  temperature_c numeric
);
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_system_metrics" ON system_metrics;
CREATE POLICY "anon_select_system_metrics" ON system_metrics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_system_metrics" ON system_metrics FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_system_metrics" ON system_metrics FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_system_metrics" ON system_metrics FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_metrics_recorded ON system_metrics (recorded_at DESC);
