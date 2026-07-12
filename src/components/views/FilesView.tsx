import { useEffect, useState } from 'react';
import {
  Folder, FileText, FileCode, FileJson, FileTerminal,
  FileImage, ChevronRight, Home, Search, Tag, X, Shield,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { FileEntry } from '../../types';
import { formatFileSize, formatRelativeTime, cn } from '../../lib/utils';

function getFileIcon(mime: string | null, name: string) {
  if (mime?.includes('typescript') || mime?.includes('javascript') || name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.js'))
    return FileCode;
  if (mime?.includes('json')) return FileJson;
  if (mime?.includes('shellscript') || name.endsWith('.sh') || name.endsWith('.bash')) return FileTerminal;
  if (mime?.includes('markdown') || name.endsWith('.md')) return FileText;
  if (mime?.includes('image')) return FileImage;
  return FileText;
}

function getFileColor(mime: string | null, name: string) {
  if (mime?.includes('typescript') || name.endsWith('.ts')) return 'text-blue-400';
  if (mime?.includes('javascript') || name.endsWith('.js')) return 'text-yellow-400';
  if (mime?.includes('json')) return 'text-amber-400';
  if (mime?.includes('shellscript') || name.endsWith('.sh')) return 'text-green-400';
  if (mime?.includes('markdown') || name.endsWith('.md')) return 'text-cyan-400';
  if (mime?.includes('image')) return 'text-purple-400';
  return 'text-slate-400';
}

export function FilesView() {
  const [allFiles, setAllFiles] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<FileEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFiles();
  }, []);

  async function loadFiles() {
    const { data } = await supabase.from('file_entries').select('*').order('type', { ascending: false }).order('name');
    setAllFiles((data || []) as FileEntry[]);
    setLoading(false);
  }

  const breadcrumbs = currentPath ? currentPath.split('/').filter(Boolean) : [];
  const displayFiles = search
    ? allFiles.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : allFiles.filter((f) => f.parent_path === currentPath);

  function navigateTo(path: string | null) {
    setCurrentPath(path);
    setSelected(null);
  }

  function breadcrumbPath(index: number): string {
    return '/' + breadcrumbs.slice(0, index + 1).join('/');
  }

  if (loading) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading files...</div>;

  return (
    <div className="h-full flex overflow-hidden">
      {/* File list */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-5 border-b border-[#1a2845]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-200 font-mono-display">File System</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Permission-based access</span>
            </div>
          </div>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-xs mb-3 overflow-x-auto">
            <button onClick={() => navigateTo(null)} className="flex items-center gap-1 text-slate-400 hover:text-cyan-300">
              <Home className="w-3.5 h-3.5" />
              <span>Root</span>
            </button>
            {breadcrumbs.map((crumb, i) => (
              <div key={i} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-slate-600" />
                <button
                  onClick={() => navigateTo(breadcrumbPath(i))}
                  className="text-slate-400 hover:text-cyan-300 whitespace-nowrap"
                >
                  {crumb}
                </button>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full bg-[#0f1830] border border-[#1a2845] rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-slate-500 hover:text-slate-300" />
              </button>
            )}
          </div>
        </div>

        {/* File grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {displayFiles.length === 0 ? (
            <div className="text-center text-slate-500 py-12 text-sm">No files in this location</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayFiles.map((file) => {
                const Icon = file.type === 'folder' ? Folder : getFileIcon(file.mime_type, file.name);
                const color = file.type === 'folder' ? 'text-cyan-400' : getFileColor(file.mime_type, file.name);
                return (
                  <button
                    key={file.id}
                    onClick={() => {
                      if (file.type === 'folder') navigateTo(file.path);
                      else setSelected(file);
                    }}
                    className={cn(
                      'panel p-4 text-left transition-all flex items-center gap-3',
                      selected?.id === file.id ? 'glow-border-cyan' : 'panel-hover',
                    )}
                  >
                    <Icon className={cn('w-8 h-8 flex-shrink-0', color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{file.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {file.type === 'folder' ? 'Folder' : formatFileSize(file.size_bytes)} — {formatRelativeTime(file.modified_at)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* File detail panel */}
      {selected && (
        <div className="w-80 border-l border-[#1a2845] bg-[#0a1020] p-5 overflow-y-auto animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-200">File Details</h3>
            <button onClick={() => setSelected(null)} className="p-1 rounded text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          </div>

          {(() => {
            const Icon = getFileIcon(selected.mime_type, selected.name);
            const color = getFileColor(selected.mime_type, selected.name);
            return (
              <div className="flex flex-col items-center mb-5">
                <div className="p-4 rounded-xl bg-[#0f1830] border border-[#1a2845] mb-3">
                  <Icon className={cn('w-12 h-12', color)} />
                </div>
                <p className="text-sm text-slate-200 font-medium text-center">{selected.name}</p>
                <p className="text-xs text-slate-500 mt-1 text-center break-all">{selected.path}</p>
              </div>
            );
          })()}

          <div className="space-y-3">
            <DetailRow label="Size" value={formatFileSize(selected.size_bytes)} />
            <DetailRow label="Type" value={selected.mime_type || 'Unknown'} />
            <DetailRow label="Modified" value={formatRelativeTime(selected.modified_at)} />
            {selected.tags.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 text-xs bg-cyan-500/10 text-cyan-300 px-2 py-1 rounded-full border border-cyan-500/20">
                      <Tag className="w-2.5 h-2.5" /> {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {selected.content_preview && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">Preview</p>
                <div className="bg-[#050810] border border-[#1a2845] rounded-lg p-3 text-xs font-mono-display text-slate-400 max-h-48 overflow-y-auto">
                  {selected.content_preview}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-300 font-mono-display">{value}</span>
    </div>
  );
}
