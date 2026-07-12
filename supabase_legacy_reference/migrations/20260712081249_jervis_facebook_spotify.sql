/*
# JERVIS — Facebook Messenger + Post Comments + Spotify

## New Tables

- `fb_conversations`: Messenger conversations with contacts
- `fb_messages`: Individual messages within conversations (inbound/outbound)
- `fb_posts`: Facebook posts with engagement metrics
- `fb_comments`: Comments on posts, with JERVIS-suggested replies
- `spotify_tracks`: Cached song search results / playlist entries
- `spotify_playlists`: User playlists

## Security
- Single-tenant, no auth. RLS enabled on all tables.
- anon + authenticated full CRUD (intentionally shared data).
*/

-- ============ fb_conversations ============
CREATE TABLE IF NOT EXISTS fb_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name text NOT NULL,
  contact_avatar text,
  contact_id text,
  unread_count integer NOT NULL DEFAULT 0,
  last_message_preview text,
  last_message_at timestamptz,
  auto_reply_enabled boolean NOT NULL DEFAULT false,
  is_online boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fb_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_fb_conversations" ON fb_conversations;
CREATE POLICY "anon_select_fb_conversations" ON fb_conversations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_fb_conversations" ON fb_conversations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_fb_conversations" ON fb_conversations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_fb_conversations" ON fb_conversations FOR DELETE TO anon, authenticated USING (true);

-- ============ fb_messages ============
CREATE TABLE IF NOT EXISTS fb_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES fb_conversations(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user','contact','jarvis')),
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  auto_replied boolean NOT NULL DEFAULT false,
  mood_tag text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fb_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_fb_messages" ON fb_messages;
CREATE POLICY "anon_select_fb_messages" ON fb_messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_fb_messages" ON fb_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_fb_messages" ON fb_messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_fb_messages" ON fb_messages FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_fb_messages_conv ON fb_messages (conversation_id, created_at);

-- ============ fb_posts ============
CREATE TABLE IF NOT EXISTS fb_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  post_type text NOT NULL DEFAULT 'text' CHECK (post_type IN ('text','photo','link','video')),
  likes integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  shares integer NOT NULL DEFAULT 0,
  posted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fb_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_fb_posts" ON fb_posts;
CREATE POLICY "anon_select_fb_posts" ON fb_posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_fb_posts" ON fb_posts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_fb_posts" ON fb_posts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_fb_posts" ON fb_posts FOR DELETE TO anon, authenticated USING (true);

-- ============ fb_comments ============
CREATE TABLE IF NOT EXISTS fb_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES fb_posts(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_avatar text,
  content text NOT NULL,
  likes integer NOT NULL DEFAULT 0,
  sentiment text CHECK (sentiment IN ('positive','neutral','negative','question')),
  jarvis_reply text,
  reply_status text NOT NULL DEFAULT 'pending' CHECK (reply_status IN ('pending','suggested','posted','ignored')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fb_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_fb_comments" ON fb_comments;
CREATE POLICY "anon_select_fb_comments" ON fb_comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_fb_comments" ON fb_comments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_fb_comments" ON fb_comments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_fb_comments" ON fb_comments FOR DELETE TO anon, authenticated USING (true);

-- ============ spotify_tracks ============
CREATE TABLE IF NOT EXISTS spotify_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text NOT NULL,
  album text,
  duration_ms integer,
  spotify_id text,
  preview_url text,
  album_art text,
  popularity integer DEFAULT 0,
  mood_tag text,
  is_playing boolean NOT NULL DEFAULT false,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE spotify_tracks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_spotify_tracks" ON spotify_tracks;
CREATE POLICY "anon_select_spotify_tracks" ON spotify_tracks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_spotify_tracks" ON spotify_tracks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_spotify_tracks" ON spotify_tracks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_spotify_tracks" ON spotify_tracks FOR DELETE TO anon, authenticated USING (true);

-- ============ spotify_playlists ============
CREATE TABLE IF NOT EXISTS spotify_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  track_count integer NOT NULL DEFAULT 0,
  cover_color text DEFAULT '#22d3ee',
  spotify_playlist_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE spotify_playlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_spotify_playlists" ON spotify_playlists;
CREATE POLICY "anon_select_spotify_playlists" ON spotify_playlists FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_spotify_playlists" ON spotify_playlists FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_spotify_playlists" ON spotify_playlists FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_spotify_playlists" ON spotify_playlists FOR DELETE TO anon, authenticated USING (true);
