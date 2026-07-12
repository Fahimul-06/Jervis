/*
# JERVIS — Connected Devices System

## New Tables

- `connected_devices`: Devices that JERVIS has been installed on and attached to
  - Tracks device info, access level, capabilities granted, location, battery, etc.
- `device_access_log`: Audit log of all actions JERVIS performs on connected devices

## Security
- Single-tenant, no auth. RLS enabled on all tables.
- anon + authenticated full CRUD (intentionally shared data).
*/

-- ============ connected_devices ============
CREATE TABLE IF NOT EXISTS connected_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_name text NOT NULL,
  device_type text NOT NULL CHECK (device_type IN ('phone','laptop','desktop','tablet','watch','tv','iot','server')),
  os text,
  os_version text,
  hostname text,
  ip_address text,
  mac_address text,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online','offline','pairing','restricted')),
  access_level text NOT NULL DEFAULT 'full' CHECK (access_level IN ('full','limited','view_only','revoked')),
  battery_percent integer,
  location text,
  last_seen timestamptz,
  paired_at timestamptz NOT NULL DEFAULT now(),
  capabilities jsonb NOT NULL DEFAULT '{
    "microphone": false,
    "filesystem": false,
    "screen": false,
    "camera": false,
    "notifications": false,
    "system_control": false,
    "network": false,
    "location": false,
    "bluetooth": false,
    "sms": false,
    "contacts": false,
    "calendar": false
  }'::jsonb,
  storage_total_gb numeric,
  storage_used_gb numeric,
  cpu_percent numeric,
  memory_total_gb numeric,
  memory_used_gb numeric,
  installed_apps integer DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE connected_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_connected_devices" ON connected_devices;
CREATE POLICY "anon_select_connected_devices" ON connected_devices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_connected_devices" ON connected_devices FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_connected_devices" ON connected_devices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_connected_devices" ON connected_devices FOR DELETE TO anon, authenticated USING (true);

-- ============ device_access_log ============
CREATE TABLE IF NOT EXISTS device_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES connected_devices(id) ON DELETE CASCADE,
  action text NOT NULL,
  capability text,
  details text,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed','denied','pending')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE device_access_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_device_access_log" ON device_access_log;
CREATE POLICY "anon_select_device_access_log" ON device_access_log FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_device_access_log" ON device_access_log FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_device_access_log" ON device_access_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_device_access_log" ON device_access_log FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_device_access_log_device ON device_access_log (device_id, created_at DESC);
