import { useEffect, useState, useRef } from 'react';
import { Search, Play, Pause, SkipForward, SkipBack, Heart, Music, Disc3, ListMusic, Volume2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { SpotifyTrack, SpotifyPlaylist } from '../../types';
import { cn } from '../../lib/utils';

// Simulated Spotify search catalog
const SEARCH_CATALOG: Omit<SpotifyTrack, 'id' | 'created_at' | 'is_playing' | 'is_favorite'>[] = [
  { title: 'Bohemian Rhapsody', artist: 'Queen', album: 'A Night at the Opera', duration_ms: 354000, spotify_id: 'sp_001', preview_url: null, album_art: 'https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop', popularity: 95, mood_tag: 'energetic' },
  { title: 'Imagine', artist: 'John Lennon', album: 'Imagine', duration_ms: 183000, spotify_id: 'sp_002', preview_url: null, album_art: 'https://images.pexels.com/photos/1762821/pexels-photo-1762821.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop', popularity: 90, mood_tag: 'calm' },
  { title: 'Starboy', artist: 'The Weeknd', album: 'Starboy', duration_ms: 230000, spotify_id: 'sp_003', preview_url: null, album_art: 'https://images.pexels.com/photos/1370543/pexels-photo-1370543.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop', popularity: 93, mood_tag: 'energetic' },
  { title: 'Clair de Lune', artist: 'Claude Debussy', album: 'Suite Bergamasque', duration_ms: 300000, spotify_id: 'sp_004', preview_url: null, album_art: 'https://images.pexels.com/photos/9570612/pexels-photo-9570612.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop', popularity: 82, mood_tag: 'calm' },
  { title: 'Formation', artist: 'Beyonce', album: 'Lemonade', duration_ms: 210000, spotify_id: 'sp_005', preview_url: null, album_art: 'https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop', popularity: 88, mood_tag: 'energetic' },
  { title: 'Fix You', artist: 'Coldplay', album: 'X&Y', duration_ms: 295000, spotify_id: 'sp_006', preview_url: null, album_art: 'https://images.pexels.com/photos/1762821/pexels-photo-1762821.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop', popularity: 87, mood_tag: 'sad' },
  { title: 'Time', artist: 'Hans Zimmer', album: 'Inception OST', duration_ms: 268000, spotify_id: 'sp_007', preview_url: null, album_art: 'https://images.pexels.com/photos/9570612/pexels-photo-9570612.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop', popularity: 89, mood_tag: 'focused' },
  { title: 'Sunflower', artist: 'Post Malone', album: 'Spider-Man: Into the Spider-Verse', duration_ms: 158000, spotify_id: 'sp_008', preview_url: null, album_art: 'https://images.pexels.com/photos/1370543/pexels-photo-1370543.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop', popularity: 94, mood_tag: 'happy' },
  { title: 'Nuvole Bianche', artist: 'Ludovico Einaudi', album: 'Una Mattina', duration_ms: 355000, spotify_id: 'sp_009', preview_url: null, album_art: 'https://images.pexels.com/photos/1762821/pexels-photo-1762821.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop', popularity: 80, mood_tag: 'sad' },
  { title: 'Take On Me', artist: 'a-ha', album: 'Hunting High and Low', duration_ms: 225000, spotify_id: 'sp_010', preview_url: null, album_art: 'https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop', popularity: 86, mood_tag: 'happy' },
  { title: 'Entry of the Gladiators', artist: 'Julius Fucik', album: 'Classical Marches', duration_ms: 198000, spotify_id: 'sp_011', preview_url: null, album_art: 'https://images.pexels.com/photos/9570612/pexels-photo-9570612.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop', popularity: 70, mood_tag: 'energetic' },
  { title: 'River Flows in You', artist: 'Yiruma', album: 'First Love', duration_ms: 198000, spotify_id: 'sp_012', preview_url: null, album_art: 'https://images.pexels.com/photos/1762821/pexels-photo-1762821.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop', popularity: 85, mood_tag: 'calm' },
  { title: 'Wake Me Up', artist: 'Avicii', album: 'True', duration_ms: 247000, spotify_id: 'sp_013', preview_url: null, album_art: 'https://images.pexels.com/photos/1370543/pexels-photo-1370543.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop', popularity: 92, mood_tag: 'energetic' },
  { title: 'Someone Like You', artist: 'Adele', album: '21', duration_ms: 285000, spotify_id: 'sp_014', preview_url: null, album_art: 'https://images.pexels.com/photos/1762821/pexels-photo-1762821.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop', popularity: 91, mood_tag: 'sad' },
  { title: 'The Less I Know The Better', artist: 'Tame Impala', album: 'Currents', duration_ms: 216000, spotify_id: 'sp_015', preview_url: null, album_art: 'https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop', popularity: 89, mood_tag: 'happy' },
];

function formatDuration(ms: number | null): string {
  if (!ms) return '--:--';
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function SpotifyView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [savedTracks, setSavedTracks] = useState<SpotifyTrack[]>([]);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.6);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadSavedTracks();
    loadPlaylists();
  }, []);

  useEffect(() => {
    if (isPlaying && currentTrack) {
      progressTimerRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= (currentTrack.duration_ms || 240000)) {
            handleNext();
            return 0;
          }
          return p + 1000;
        });
      }, 1000);
    } else {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    }
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isPlaying, currentTrack]);

  async function loadSavedTracks() {
    const { data } = await supabase.from('spotify_tracks').select('*').order('created_at', { ascending: false });
    setSavedTracks((data || []) as SpotifyTrack[]);
  }

  async function loadPlaylists() {
    const { data } = await supabase.from('spotify_playlists').select('*').order('created_at', { ascending: false });
    setPlaylists((data || []) as SpotifyPlaylist[]);
  }

  function handleSearch() {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    setTimeout(() => {
      const q = searchQuery.toLowerCase();
      const results = SEARCH_CATALOG.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          (t.album || '').toLowerCase().includes(q),
      ).map((t) => ({
        ...t,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        is_playing: false,
        is_favorite: false,
      }));
      setSearchResults(results);
      setSearching(false);
    }, 600);
  }

  function playTrack(track: SpotifyTrack) {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
      return;
    }
    setCurrentTrack(track);
    setProgress(0);
    setIsPlaying(true);
  }

  function handleNext() {
    const list = searchResults.length > 0 ? searchResults : savedTracks;
    const idx = list.findIndex((t) => t.id === currentTrack?.id);
    const next = list[(idx + 1) % list.length];
    if (next) {
      setCurrentTrack(next);
      setProgress(0);
      setIsPlaying(true);
    }
  }

  function handlePrev() {
    const list = searchResults.length > 0 ? searchResults : savedTracks;
    const idx = list.findIndex((t) => t.id === currentTrack?.id);
    const prev = list[(idx - 1 + list.length) % list.length];
    if (prev) {
      setCurrentTrack(prev);
      setProgress(0);
      setIsPlaying(true);
    }
  }

  async function toggleFavorite(track: SpotifyTrack) {
    const newFav = !track.is_favorite;
    // Check if already in DB
    const existing = savedTracks.find((t) => t.title === track.title && t.artist === track.artist);
    if (existing) {
      await supabase.from('spotify_tracks').update({ is_favorite: newFav }).eq('id', existing.id);
      setSavedTracks((prev) => prev.map((t) => t.id === existing.id ? { ...t, is_favorite: newFav } : t));
    } else {
      const { data } = await supabase.from('spotify_tracks').insert({
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration_ms: track.duration_ms,
        spotify_id: track.spotify_id,
        album_art: track.album_art,
        popularity: track.popularity,
        mood_tag: track.mood_tag,
        is_favorite: newFav,
      }).select().single();
      if (data) setSavedTracks((prev) => [data as SpotifyTrack, ...prev]);
    }
    setSearchResults((prev) => prev.map((t) => t.id === track.id ? { ...t, is_favorite: newFav } : t));
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0e1a]">
      {/* Spotify header */}
      <div className="px-6 py-4 border-b border-[#1a2845] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#1DB954]/10 border border-[#1DB954]/20">
            <Music className="w-5 h-5 text-[#1DB954]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-200">Spotify</h2>
            <p className="text-xs text-slate-500">{savedTracks.length} saved tracks · {playlists.length} playlists</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search songs, artists, albums..."
            className="w-full bg-[#0f1830] border border-[#1a2845] rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#1DB954]/40"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1DB954] animate-spin" />}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-300">Search Results</h3>
              <button onClick={() => { setSearchResults([]); setSearchQuery(''); }} className="text-xs text-slate-500 hover:text-slate-300">
                Clear
              </button>
            </div>
            <div className="space-y-1">
              {searchResults.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  isCurrent={currentTrack?.id === track.id}
                  isPlaying={isPlaying && currentTrack?.id === track.id}
                  onPlay={() => playTrack(track)}
                  onFavorite={() => toggleFavorite(track)}
                />
              ))}
            </div>
          </div>
        )}

        {/* No search — show playlists + saved tracks */}
        {searchResults.length === 0 && (
          <>
            {/* Playlists */}
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 mb-3">
                <ListMusic className="w-4 h-4 text-[#1DB954]" />
                <h3 className="text-sm font-bold text-slate-300">Your Playlists</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {playlists.map((pl) => (
                  <div
                    key={pl.id}
                    className="panel p-4 hover:bg-white/5 transition-all cursor-pointer group"
                  >
                    <div
                      className="w-full aspect-square rounded-lg mb-3 flex items-center justify-center relative overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${pl.cover_color}40, ${pl.cover_color}10)` }}
                    >
                      <Disc3 className="w-8 h-8" style={{ color: pl.cover_color }} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-8 h-8 text-white" fill="white" />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-slate-200 truncate">{pl.name}</p>
                    <p className="text-xs text-slate-500 truncate">{pl.track_count} tracks</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Saved / favorite tracks */}
            <div className="px-6 py-4 border-t border-[#1a2845]/50">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-[#1DB954]" />
                <h3 className="text-sm font-bold text-slate-300">Saved Tracks</h3>
              </div>
              <div className="space-y-1">
                {savedTracks.length === 0 ? (
                  <p className="text-center text-slate-500 text-sm py-8">No saved tracks yet. Search and favorite songs to see them here.</p>
                ) : (
                  savedTracks.map((track) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      isCurrent={currentTrack?.id === track.id}
                      isPlaying={isPlaying && currentTrack?.id === track.id}
                      onPlay={() => playTrack(track)}
                      onFavorite={() => toggleFavorite(track)}
                    />
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Now playing bar */}
      {currentTrack && (
        <div className="flex-shrink-0 border-t border-[#1a2845] bg-[#0d1424] px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Track info */}
            <div className="flex items-center gap-3 min-w-0 w-56">
              <img
                src={currentTrack.album_art || ''}
                alt={currentTrack.album || ''}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{currentTrack.title}</p>
                <p className="text-xs text-slate-500 truncate">{currentTrack.artist}</p>
              </div>
              <button
                onClick={() => toggleFavorite(currentTrack)}
                className="flex-shrink-0 text-slate-500 hover:text-[#1DB954]"
              >
                <Heart className={cn('w-4 h-4', currentTrack.is_favorite && 'fill-[#1DB954] text-[#1DB954]')} />
              </button>
            </div>

            {/* Controls + progress */}
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-4">
                <button onClick={handlePrev} className="text-slate-400 hover:text-white">
                  <SkipBack className="w-4 h-4" fill="currentColor" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
                >
                  {isPlaying ? <Pause className="w-4 h-4" fill="black" /> : <Play className="w-4 h-4" fill="black" />}
                </button>
                <button onClick={handleNext} className="text-slate-400 hover:text-white">
                  <SkipForward className="w-4 h-4" fill="currentColor" />
                </button>
              </div>
              <div className="flex items-center gap-2 w-full max-w-md">
                <span className="text-[10px] text-slate-600 font-mono-display w-9 text-right">
                  {formatDuration(progress)}
                </span>
                <div className="flex-1 h-1 bg-[#1a2845] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1DB954] rounded-full transition-all"
                    style={{ width: `${(progress / (currentTrack.duration_ms || 240000)) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-600 font-mono-display w-9">
                  {formatDuration(currentTrack.duration_ms)}
                </span>
              </div>
            </div>

            {/* Volume */}
            <div className="hidden md:flex items-center gap-2 w-28">
              <Volume2 className="w-4 h-4 text-slate-500" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 accent-[#1DB954] h-1"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrackRow({
  track,
  isCurrent,
  isPlaying,
  onPlay,
  onFavorite,
}: {
  track: SpotifyTrack;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onFavorite: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg transition-all group',
        isCurrent ? 'bg-[#1DB954]/10' : 'hover:bg-white/5',
      )}
    >
      <button onClick={onPlay} className="relative flex-shrink-0">
        <img
          src={track.album_art || ''}
          alt={track.album || ''}
          className="w-10 h-10 rounded-md object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className={cn(
          'absolute inset-0 bg-black/50 rounded-md flex items-center justify-center transition-opacity',
          isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}>
          {isPlaying ? <Pause className="w-4 h-4 text-white" fill="white" /> : <Play className="w-4 h-4 text-white" fill="white" />}
        </div>
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', isCurrent ? 'text-[#1DB954]' : 'text-slate-200')}>
          {track.title}
        </p>
        <p className="text-xs text-slate-500 truncate">{track.artist} · {track.album}</p>
      </div>

      {track.mood_tag && (
        <span className="hidden sm:block text-[10px] text-slate-600 capitalize px-2 py-0.5 rounded-full bg-[#1a2845]/50">
          {track.mood_tag}
        </span>
      )}

      <span className="text-xs text-slate-600 font-mono-display hidden sm:block">
        {formatDuration(track.duration_ms)}
      </span>

      <button onClick={onFavorite} className="flex-shrink-0 text-slate-600 hover:text-[#1DB954] opacity-0 group-hover:opacity-100 transition-opacity">
        <Heart className={cn('w-4 h-4', track.is_favorite && 'fill-[#1DB954] text-[#1DB954] opacity-100')} />
      </button>
    </div>
  );
}
