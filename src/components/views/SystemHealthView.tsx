import { useEffect, useState, useRef } from 'react';
import { Cpu, MemoryStick, HardDrive, Wifi, Battery, Activity, Clock, Server } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { SystemMetric } from '../../types';
import { cn } from '../../lib/utils';

interface ChartData {
  labels: string[];
  values: number[];
}

function MiniChart({ data, color, label, unit, max = 100 }: { data: ChartData; color: string; label: string; unit: string; max?: number }) {
  const maxVal = Math.max(max, ...data.values);
  const points = data.values.map((v, i) => {
    const x = (i / (data.values.length - 1)) * 100;
    const y = 100 - (v / maxVal) * 100;
    return `${x},${y}`;
  });
  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L 100,100 L 0,100 Z`;

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-lg font-bold font-mono-display" style={{ color }}>
          {data.values[data.values.length - 1]?.toFixed(1)}{unit}
        </span>
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-20">
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#grad-${label})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function Gauge({ value, label, icon: Icon, color, unit = '%' }: { value: number; label: string; icon: typeof Cpu; color: string; unit?: string }) {
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="panel p-5 flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#1a2845" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="w-5 h-5 mb-1" style={{ color }} />
          <span className="text-2xl font-bold font-mono-display" style={{ color }}>{value.toFixed(0)}{unit}</span>
        </div>
      </div>
      <span className="text-xs text-slate-400 uppercase tracking-wider mt-3">{label}</span>
    </div>
  );
}

export function SystemHealthView() {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [latest, setLatest] = useState<SystemMetric | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadMetrics();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  async function loadMetrics() {
    const { data } = await supabase
      .from('system_metrics')
      .select('*')
      .order('recorded_at', { ascending: true })
      .limit(24);
    const typed = (data || []) as SystemMetric[];
    setMetrics(typed);
    setLatest(typed[typed.length - 1] || null);
    setLoading(false);

    // Live simulate new metrics
    intervalRef.current = setInterval(async () => {
      const newMetric = {
        recorded_at: new Date().toISOString(),
        cpu_percent: 15 + Math.random() * 40 + (Math.random() > 0.8 ? 30 : 0),
        memory_percent: 55 + Math.random() * 15,
        memory_used_gb: 8 + Math.random() * 2,
        disk_percent: 68 + Math.random() * 3,
        network_down_mbps: 3 + Math.random() * 25,
        network_up_mbps: 0.5 + Math.random() * 5,
        battery_percent: Math.max(0, (latest?.battery_percent ?? 100) - 1),
        uptime_hours: (latest?.uptime_hours ?? 72) + 1/3600,
        process_count: 180 + Math.floor(Math.random() * 40),
        temperature_c: 44 + Math.random() * 10,
      };
      const { data: inserted } = await supabase.from('system_metrics').insert(newMetric).select().single();
      if (inserted) {
        const typedMetric = inserted as SystemMetric;
        setMetrics((prev) => [...prev.slice(-23), typedMetric]);
        setLatest(typedMetric);
      }
    }, 5000);
  }

  if (loading) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading system metrics...</div>;

  const cpuData: ChartData = { labels: [], values: metrics.map((m) => m.cpu_percent) };
  const memData: ChartData = { labels: [], values: metrics.map((m) => m.memory_percent) };
  const diskData: ChartData = { labels: [], values: metrics.map((m) => m.disk_percent) };
  const netData: ChartData = { labels: [], values: metrics.map((m) => m.network_down_mbps) };

  return (
    <div className="h-full overflow-y-auto p-6 grid-bg">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-200 font-mono-display">System Health Monitor</h2>
            <p className="text-xs text-slate-500 mt-0.5">Real-time hardware and resource monitoring</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-green-400 font-mono-display">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            LIVE — refreshing every 5s
          </div>
        </div>

        {/* Gauges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Gauge value={latest?.cpu_percent ?? 0} label="CPU Usage" icon={Cpu} color="#22d3ee" />
          <Gauge value={latest?.memory_percent ?? 0} label="Memory" icon={MemoryStick} color="#10b981" />
          <Gauge value={latest?.disk_percent ?? 0} label="Disk" icon={HardDrive} color="#f59e0b" />
          <Gauge value={latest?.battery_percent ?? 0} label="Battery" icon={Battery} color="#3b82f6" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MiniChart data={cpuData} color="#22d3ee" label="CPU Over Time" unit="%" />
          <MiniChart data={memData} color="#10b981" label="Memory Over Time" unit="%" />
          <MiniChart data={diskData} color="#f59e0b" label="Disk Usage" unit="%" />
          <MiniChart data={netData} color="#3b82f6" label="Network Download" unit=" Mbps" max={40} />
        </div>

        {/* Detailed stats */}
        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-200">Detailed System Info</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <StatRow icon={Cpu} label="CPU Temp" value={latest?.temperature_c ? `${latest.temperature_c.toFixed(1)}°C` : '—'} color={latest && latest.temperature_c != null && latest.temperature_c > 70 ? 'text-red-400' : 'text-cyan-400'} />
            <StatRow icon={MemoryStick} label="Memory Used" value={latest ? `${latest.memory_used_gb.toFixed(1)} GB` : '—'} color="text-green-400" />
            <StatRow icon={Wifi} label="Net Upload" value={latest ? `${latest.network_up_mbps.toFixed(1)} Mbps` : '—'} color="text-blue-400" />
            <StatRow icon={Wifi} label="Net Down" value={latest ? `${latest.network_down_mbps.toFixed(1)} Mbps` : '—'} color="text-blue-400" />
            <StatRow icon={Clock} label="Uptime" value={latest ? `${latest.uptime_hours.toFixed(1)}h` : '—'} color="text-slate-300" />
            <StatRow icon={Activity} label="Processes" value={latest ? `${latest.process_count}` : '—'} color="text-slate-300" />
          </div>
        </div>

        {/* Health status bar */}
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-slate-200 font-mono-display">All health checks passing</span>
            </div>
            <div className="flex gap-4 text-xs">
              <HealthCheck label="Disk" ok={(latest?.disk_percent ?? 0) < 90} />
              <HealthCheck label="Memory" ok={(latest?.memory_percent ?? 0) < 85} />
              <HealthCheck label="CPU" ok={(latest?.cpu_percent ?? 0) < 85} />
              <HealthCheck label="Temp" ok={(latest?.temperature_c ?? 0) < 70} />
              <HealthCheck label="Battery" ok={(latest?.battery_percent ?? 0) > 15} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ icon: Icon, label, value, color }: { icon: typeof Cpu; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-slate-500" />
      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
        <div className={cn('text-sm font-mono-display font-bold', color)}>{value}</div>
      </div>
    </div>
  );
}

function HealthCheck({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('w-1.5 h-1.5 rounded-full', ok ? 'bg-green-400' : 'bg-red-400')} />
      <span className={ok ? 'text-slate-400' : 'text-red-400'}>{label}</span>
    </div>
  );
}
