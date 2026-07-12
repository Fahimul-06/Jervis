import { useEffect, useState } from 'react';
import {
  GitBranch, Star, GitFork, AlertCircle, Github,
  CheckCircle2, Clock, ExternalLink, GitCommit,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GithubRepo } from '../../types';
import { formatTimeUntil, formatRelativeTime, cn } from '../../lib/utils';

export function GitHubView() {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [selected, setSelected] = useState<GithubRepo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRepos();
  }, []);

  async function loadRepos() {
    const { data } = await supabase.from('github_repos').select('*').order('last_commit_at', { ascending: false });
    const typed = (data || []) as GithubRepo[];
    setRepos(typed);
    setSelected(typed[0] || null);
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading repositories...</div>;

  const totalStars = repos.reduce((s, r) => s + r.stars, 0);
  const totalForks = repos.reduce((s, r) => s + r.forks, 0);
  const totalIssues = repos.reduce((s, r) => s + r.open_issues, 0);
  const healthyCount = repos.filter((r) => r.health_status === 'healthy').length;

  return (
    <div className="h-full flex overflow-hidden">
      {/* Repo list */}
      <div className="w-80 border-r border-[#1a2845] overflow-y-auto flex-shrink-0">
        <div className="p-5 border-b border-[#1a2845]">
          <h2 className="text-lg font-bold text-slate-200 font-mono-display mb-3">GitHub Repos</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="panel p-2.5">
              <div className="text-slate-500">Stars</div>
              <div className="text-amber-400 font-bold font-mono-display">{totalStars.toLocaleString()}</div>
            </div>
            <div className="panel p-2.5">
              <div className="text-slate-500">Forks</div>
              <div className="text-blue-400 font-bold font-mono-display">{totalForks.toLocaleString()}</div>
            </div>
            <div className="panel p-2.5">
              <div className="text-slate-500">Issues</div>
              <div className="text-red-400 font-bold font-mono-display">{totalIssues}</div>
            </div>
            <div className="panel p-2.5">
              <div className="text-slate-500">Healthy</div>
              <div className="text-green-400 font-bold font-mono-display">{healthyCount}/{repos.length}</div>
            </div>
          </div>
        </div>

        <div className="p-3 space-y-2">
          {repos.map((repo) => (
            <button
              key={repo.id}
              onClick={() => setSelected(repo)}
              className={cn(
                'w-full text-left p-3 rounded-lg border transition-all',
                selected?.id === repo.id
                  ? 'bg-cyan-500/10 border-cyan-500/30'
                  : 'bg-[#0f1830] border-[#1a2845] hover:border-cyan-500/20',
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-200 font-medium truncate">{repo.name}</span>
                <span className={cn(
                  'w-2 h-2 rounded-full flex-shrink-0',
                  repo.health_status === 'healthy' ? 'bg-green-400' : repo.health_status === 'warning' ? 'bg-amber-400' : 'bg-red-400',
                )} />
              </div>
              <p className="text-xs text-slate-500 truncate mb-2">{repo.description}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3" /> {repo.stars}
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="w-3 h-3" /> {repo.forks}
                </span>
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {repo.open_issues}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Repo detail */}
      <div className="flex-1 overflow-y-auto p-6 grid-bg">
        {selected ? (
          <div className="max-w-3xl mx-auto space-y-5">
            {/* Header */}
            <div className="panel p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-[#0f1830] border border-[#1a2845]">
                    <Github className="w-7 h-7 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-200">{selected.name}</h2>
                    <p className="text-sm text-slate-500">{selected.full_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-xs font-bold px-3 py-1 rounded-full',
                    selected.health_status === 'healthy' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    selected.health_status === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-red-500/10 text-red-400 border border-red-500/20',
                  )}>
                    {selected.health_status.toUpperCase()}
                  </span>
                  {selected.url && (
                    <a href={selected.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-[#0f1830] border border-[#1a2845] text-slate-400 hover:text-cyan-300">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-400">{selected.description}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={Star} label="Stars" value={selected.stars.toLocaleString()} color="text-amber-400" bg="bg-amber-500/10" />
              <StatCard icon={GitFork} label="Forks" value={selected.forks.toLocaleString()} color="text-blue-400" bg="bg-blue-500/10" />
              <StatCard icon={AlertCircle} label="Open Issues" value={selected.open_issues.toString()} color="text-red-400" bg="bg-red-500/10" />
              <StatCard icon={GitBranch} label="Branch" value={selected.default_branch} color="text-green-400" bg="bg-green-500/10" />
            </div>

            {/* Latest commit */}
            <div className="panel p-5">
              <div className="flex items-center gap-2 mb-3">
                <GitCommit className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-200">Latest Commit</h3>
              </div>
              {selected.last_commit_message ? (
                <div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-200 font-mono-display">{selected.last_commit_message}</p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {selected.last_commit_at ? `${formatTimeUntil(selected.last_commit_at)} — ${formatRelativeTime(selected.last_commit_at)}` : 'unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No recent commits</p>
              )}
            </div>

            {/* Health analysis */}
            <div className="panel p-5">
              <h3 className="text-sm font-bold text-slate-200 mb-3">JERVIS Health Analysis</h3>
              <div className="space-y-2">
                <HealthLine label="CI Pipeline" ok={selected.health_status !== 'critical'} detail={selected.health_status === 'critical' ? 'Failing tests detected' : 'All checks passing'} />
                <HealthLine label="Issue Backlog" ok={selected.open_issues < 20} detail={selected.open_issues < 20 ? 'Manageable issue count' : `${selected.open_issues} issues need attention`} />
                <HealthLine label="Recent Activity" ok={selected.last_commit_at ? Date.now() - new Date(selected.last_commit_at).getTime() < 86400000 : false} detail={selected.last_commit_at ? 'Active within 24h' : 'No recent activity'} />
                <HealthLine label="Language" ok={!!selected.language} detail={selected.language || 'Not specified'} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">Select a repository to view details</div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: { icon: typeof Star; label: string; value: string; color: string; bg: string }) {
  return (
    <div className="panel p-4">
      <div className={`p-1.5 rounded-lg ${bg} inline-block mb-2`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className={`text-lg font-bold font-mono-display ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function HealthLine({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <div className={cn('w-2 h-2 rounded-full', ok ? 'bg-green-400' : 'bg-amber-400')} />
        <span className="text-slate-300">{label}</span>
      </div>
      <span className={ok ? 'text-slate-400 text-xs' : 'text-amber-400 text-xs'}>{detail}</span>
    </div>
  );
}
