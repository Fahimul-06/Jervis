/*
# JERVIS — Mood History & Device Permissions

## 1. New Tables

- `mood_history`: Records of detected user moods over time.
  - `id` (uuid, PK)
  - `mood` (text: 'happy'|'calm'|'focused'|'energetic'|'stressed'|'sad'|'neutral')
  - `confidence` (numeric 0-1)
  - `source` (text: 'chat'|'voice'|'schedule'|'system')
  - `trigger_text` (text, the user input that triggered detection, nullable)
  - `music_played` (text, the music mode played, nullable)
  - `created_at` (timestamptz)

- `device_permissions`: Tracks which device capabilities the user has granted.
  - `id` (uuid, PK)
  - `permission` (text, unique: 'microphone'|'filesystem'|'notifications'|'system_control'|'network'|'location')
  - `display_name` (text)
  - `granted` (boolean, default false)
  - `granted_at` (timestamptz, nullable)
  - `description` (text)
  - `created_at` (timestamptz)

## 2. Security
- Single-tenant, no auth. RLS enabled on all tables.
- anon + authenticated full CRUD (intentionally shared data).
*/

-- ============ mood_history ============
CREATE TABLE IF NOT EXISTS mood_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mood text NOT NULL CHECK (mood IN ('happy','calm','focused','energetic','stressed','sad','neutral')),
  confidence numeric NOT NULL DEFAULT 0.5,
  source text NOT NULL DEFAULT 'chat' CHECK (source IN ('chat','voice','schedule','system')),
  trigger_text text,
  music_played text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE mood_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_mood_history" ON mood_history;
CREATE POLICY "anon_select_mood_history" ON mood_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_mood_history" ON mood_history FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_mood_history" ON mood_history FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_mood_history" ON mood_history FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_mood_history_created ON mood_history (created_at DESC);

-- ============ device_permissions ============
CREATE TABLE IF NOT EXISTS device_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission text UNIQUE NOT NULL,
  display_name text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  granted_at timestamptz,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE device_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_device_permissions" ON device_permissions;
CREATE POLICY "anon_select_device_permissions" ON device_permissions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_device_permissions" ON device_permissions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_device_permissions" ON device_permissions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_device_permissions" ON device_permissions FOR DELETE TO anon, authenticated USING (true);
