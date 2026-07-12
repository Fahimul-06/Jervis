import { useEffect, useState, useCallback } from 'react';
import {
  Smartphone, Laptop, Monitor, Tablet, Watch, Tv, Cpu, Server,
  Wifi, WifiOff, Battery, BatteryLow, MapPin, HardDrive, MemoryStick,
  Activity, Shield, ShieldCheck, ShieldAlert, ShieldOff, Plus,
  RefreshCw, X, Check, Lock, Power, Radio, Download,
  Cpu as CpuIcon, FileText, Mic, Camera, Bell, Bluetooth, MessageSquare, Calendar, User, Search,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ConnectedDevice, DeviceAccessLog, DeviceType, AccessLevel, DeviceCapabilities } from '../../types';
import { cn, formatRelativeTime } from '../../lib/utils';
import { InstallGuide } from './InstallGuide';

const DEVICE_ICONS: Record<DeviceType, typeof Smartphone> = {
  phone: Smartphone,
  laptop: Laptop,
  desktop: Monitor,
  tablet: Tablet,
  watch: Watch,
  tv: Tv,
  iot: Cpu,
  server: Server,
};

const CAPABILITY_ICONS: Record<keyof DeviceCapabilities, typeof Mic> = {
  microphone: Mic,
  filesystem: FileText,
  screen: Monitor,
  camera: Camera,
  notifications: Bell,
  system_control: CpuIcon,
  network: Wifi,
  location: MapPin,
  bluetooth: Bluetooth,
  sms: MessageSquare,
  contacts: User,
  calendar: Calendar,
};

const CAPABILITY_LABELS: Record<keyof DeviceCapabilities, string> = {
  microphone: 'Microphone',
  filesystem: 'File System',
  screen: 'Screen',
  camera: 'Camera',
  notifications: 'Notifications',
  system_control: 'System Control',
  network: 'Network',
  location: 'Location',
  bluetooth: 'Bluetooth',
  sms: 'SMS',
  contacts: 'Contacts',
  calendar: 'Calendar',
};

const ACCESS_LEVEL_CONFIG: Record<AccessLevel, { label: string; color: string; icon: typeof Shield; bg: string; border: string }> = {
  full: { label: 'Full Access', color: 'text-green-400', icon: ShieldCheck, bg: 'bg-green-500/10', border: 'border-green-500/30' },
  limited: { label: 'Limited Access', color: 'text-amber-400', icon: ShieldAlert, bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  view_only: { label: 'View Only', color: 'text-blue-400', icon: Shield, bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  revoked: { label: 'Revoked', color: 'text-red-400', icon: ShieldOff, bg: 'bg-red-500/10', border: 'border-red-500/30' },
};

export function DevicesView() {
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<ConnectedDevice | null>(null);
  const [accessLogs, setAccessLogs] = useState<DeviceAccessLog[]>([]);
  const [showPairing, setShowPairing] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [pairingStep, setPairingStep] = useState<'scan' | 'found' | 'connecting' | 'connected'>('scan');
  const [pairingDevice, setPairingDevice] = useState<Partial<ConnectedDevice> | null>(null);
  const [pairingCapabilities, setPairingCapabilities] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) loadAccessLogs(selectedDevice.id);
  }, [selectedDevice]);

  async function loadDevices() {
    const { data } = await supabase.from('connected_devices').select('*').order('is_primary', { ascending: false }).order('paired_at', { ascending: false });
    setDevices((data || []) as ConnectedDevice[]);
  }

  async function loadAccessLogs(deviceId: string) {
    const { data } = await supabase
      .from('device_access_log')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(20);
    setAccessLogs((data || []) as DeviceAccessLog[]);
  }

  const startPairing = useCallback(async () => {
    setShowPairing(true);
    setPairingStep('scan');
    setPairingDevice(null);
    setPairingCapabilities(new Set());

    await new Promise((r) => setTimeout(r, 1500));
    setPairingStep('found');

    // Simulate discovering a new device on the network
    const discovered: Partial<ConnectedDevice> = {
      device_name: 'New Android Device',
      device_type: 'phone',
      os: 'Android 14',
      os_version: '14.0',
      hostname: 'android-jarvis',
      ip_address: '192.168.1.' + Math.floor(Math.random() * 200 + 50),
      mac_address: 'AC:DE:48:' + Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase() + ':' + Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase() + ':' + Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase(),
    };
    setPairingDevice(discovered);
  }, []);

  function selectPairingDeviceType(type: DeviceType) {
    const presets: Record<DeviceType, Partial<ConnectedDevice>> = {
      phone: { device_name: 'New Android Device', os: 'Android 14', os_version: '14.0' },
      laptop: { device_name: 'New Laptop', os: 'Ubuntu 24.04', os_version: '24.04' },
      desktop: { device_name: 'New Desktop', os: 'Windows 11', os_version: '23H2' },
      tablet: { device_name: 'New Tablet', os: 'Android 14', os_version: '14.0' },
      watch: { device_name: 'New Smartwatch', os: 'Wear OS 4', os_version: '4.0' },
      tv: { device_name: 'New Smart TV', os: 'Android TV', os_version: '12' },
      iot: { device_name: 'IoT Device', os: 'Custom', os_version: '1.0' },
      server: { device_name: 'New Server', os: 'Linux', os_version: 'Ubuntu 22.04' },
    };
    setPairingDevice({ ...pairingDevice, ...presets[type], device_type: type });
  }

  async function confirmPairing() {
    if (!pairingDevice || !pairingDevice.device_type) return;
    setPairingStep('connecting');
    await new Promise((r) => setTimeout(r, 2000));

    const capabilities: DeviceCapabilities = {
      microphone: pairingCapabilities.has('microphone'),
      filesystem: pairingCapabilities.has('filesystem'),
      screen: pairingCapabilities.has('screen'),
      camera: pairingCapabilities.has('camera'),
      notifications: pairingCapabilities.has('notifications'),
      system_control: pairingCapabilities.has('system_control'),
      network: pairingCapabilities.has('network'),
      location: pairingCapabilities.has('location'),
      bluetooth: pairingCapabilities.has('bluetooth'),
      sms: pairingCapabilities.has('sms'),
      contacts: pairingCapabilities.has('contacts'),
      calendar: pairingCapabilities.has('calendar'),
    };

    const { data } = await supabase.from('connected_devices').insert({
      device_name: pairingDevice.device_name || 'Unnamed Device',
      device_type: pairingDevice.device_type,
      os: pairingDevice.os,
      os_version: pairingDevice.os_version,
      hostname: pairingDevice.hostname,
      ip_address: pairingDevice.ip_address,
      mac_address: pairingDevice.mac_address,
      status: 'online',
      access_level: 'full',
      last_seen: new Date().toISOString(),
      capabilities,
    }).select().single();

    if (data) {
      // Log the pairing
      await supabase.from('device_access_log').insert({
        device_id: (data as ConnectedDevice).id,
        action: 'device_paired',
        capability: 'system_control',
        details: `Device paired with capabilities: ${Array.from(pairingCapabilities).join(', ')}`,
        status: 'success',
      });
      await loadDevices();
    }

    setPairingStep('connected');
    await new Promise((r) => setTimeout(r, 1500));
    setShowPairing(false);
    setPairingStep('scan');
    setPairingDevice(null);
    setPairingCapabilities(new Set());
  }

  async function updateAccessLevel(device: ConnectedDevice, level: AccessLevel) {
    await supabase.from('connected_devices').update({ access_level: level }).eq('id', device.id);
    setDevices((prev) => prev.map((d) => d.id === device.id ? { ...d, access_level: level } : d));
    if (selectedDevice?.id === device.id) setSelectedDevice({ ...device, access_level: level });

    await supabase.from('device_access_log').insert({
      device_id: device.id,
      action: 'access_level_changed',
      capability: 'system_control',
      details: `Access level changed to: ${level}`,
      status: 'success',
    });
    if (selectedDevice) loadAccessLogs(device.id);
  }

  async function toggleCapability(device: ConnectedDevice, cap: keyof DeviceCapabilities) {
    const newCaps = { ...device.capabilities, [cap]: !device.capabilities[cap] };
    await supabase.from('connected_devices').update({ capabilities: newCaps }).eq('id', device.id);
    setDevices((prev) => prev.map((d) => d.id === device.id ? { ...d, capabilities: newCaps } : d));
    if (selectedDevice?.id === device.id) setSelectedDevice({ ...device, capabilities: newCaps });

    await supabase.from('device_access_log').insert({
      device_id: device.id,
      action: 'capability_toggled',
      capability: cap,
      details: `${CAPABILITY_LABELS[cap]} ${newCaps[cap] ? 'enabled' : 'disabled'}`,
      status: 'success',
    });
    if (selectedDevice) loadAccessLogs(device.id);
  }

  async function toggleDeviceStatus(device: ConnectedDevice) {
    const newStatus = device.status === 'online' ? 'offline' : 'online';
    await supabase.from('connected_devices').update({ status: newStatus, last_seen: new Date().toISOString() }).eq('id', device.id);
    setDevices((prev) => prev.map((d) => d.id === device.id ? { ...d, status: newStatus } : d));
    if (selectedDevice?.id === device.id) setSelectedDevice({ ...device, status: newStatus });
  }

  async function removeDevice(device: ConnectedDevice) {
    await supabase.from('connected_devices').delete().eq('id', device.id);
    setDevices((prev) => prev.filter((d) => d.id !== device.id));
    setSelectedDevice(null);
  }

  function togglePairingCapability(cap: string) {
    setPairingCapabilities((prev) => {
      const next = new Set(prev);
      if (next.has(cap)) next.delete(cap);
      else next.add(cap);
      return next;
    });
  }

  const onlineCount = devices.filter((d) => d.status === 'online').length;
  const fullAccessCount = devices.filter((d) => d.access_level === 'full').length;
  const totalCapabilities = devices.reduce((sum, d) => sum + Object.values(d.capabilities).filter(Boolean).length, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1a2845] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Radio className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-200">Connected Devices</h2>
            <p className="text-xs text-slate-500">
              {devices.length} devices attached · {onlineCount} online · {fullAccessCount} with full access · {totalCapabilities} capabilities granted
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInstall(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0f1830] border border-[#1a2845] text-slate-300 hover:text-slate-100 hover:border-cyan-500/30 transition-all text-sm font-medium"
          >
            <Download className="w-4 h-4" /> How to Install
          </button>
          <button
            onClick={startPairing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Pair New Device
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Device grid */}
        <div className={cn('flex-1 overflow-y-auto p-6', selectedDevice && 'hidden lg:block')}>
          {devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Radio className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-slate-500 text-sm mb-1">No devices connected yet</p>
              <p className="text-slate-600 text-xs mb-4">Install JERVIS on any device to attach it to your network</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowInstall(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 transition-all text-sm font-medium"
                >
                  <Download className="w-4 h-4" /> How to Install
                </button>
                <button
                  onClick={startPairing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0f1830] border border-[#1a2845] text-slate-300 hover:text-slate-100 hover:border-cyan-500/30 transition-all text-sm font-medium"
                >
                  <Plus className="w-4 h-4" /> Pair Device
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {devices.map((device) => {
                const Icon = DEVICE_ICONS[device.device_type];
                const accessCfg = ACCESS_LEVEL_CONFIG[device.access_level];
                const AccessIcon = accessCfg.icon;
                const enabledCaps = Object.entries(device.capabilities).filter(([, v]) => v).length;

                return (
                  <div
                    key={device.id}
                    onClick={() => setSelectedDevice(device)}
                    className={cn(
                      'panel p-5 cursor-pointer transition-all hover:glow-border-cyan group',
                      selectedDevice?.id === device.id && 'glow-border-cyan',
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'p-3 rounded-xl border',
                          device.status === 'online'
                            ? 'bg-cyan-500/10 border-cyan-500/20'
                            : 'bg-[#0f1830] border-[#1a2845]',
                        )}>
                          <Icon className={cn('w-6 h-6', device.status === 'online' ? 'text-cyan-400' : 'text-slate-600')} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-200">{device.device_name}</h3>
                            {device.is_primary && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-bold">PRIMARY</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{device.os} {device.os_version}</p>
                        </div>
                      </div>
                      <div className={cn('flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border', accessCfg.bg, accessCfg.border, accessCfg.color)}>
                        <AccessIcon className="w-3 h-3" />
                        {accessCfg.label}
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-500">
                        {device.status === 'online' ? <Wifi className="w-3.5 h-3.5 text-green-400" /> : <WifiOff className="w-3.5 h-3.5 text-slate-600" />}
                        <span className={device.status === 'online' ? 'text-green-400' : 'text-slate-600'}>
                          {device.status === 'online' ? 'Online' : 'Offline'}
                        </span>
                        {device.battery_percent !== null && (
                          <>
                            {device.battery_percent < 20 ? (
                              <BatteryLow className="w-3.5 h-3.5 text-amber-400 ml-2" />
                            ) : (
                              <Battery className="w-3.5 h-3.5 text-slate-500 ml-2" />
                            )}
                            <span className={device.battery_percent < 20 ? 'text-amber-400' : 'text-slate-500'}>{device.battery_percent}%</span>
                          </>
                        )}
                        <span className="ml-auto text-slate-600">
                          {enabledCaps}/12 capabilities
                        </span>
                      </div>

                      {device.location && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="w-3 h-3" /> {device.location}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-slate-600">
                        <span className="font-mono-display text-[10px]">{device.ip_address}</span>
                        <span className="ml-auto">{device.last_seen ? formatRelativeTime(device.last_seen) : ''}</span>
                      </div>
                    </div>

                    {/* Capability dots */}
                    <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-[#1a2845]/50">
                      {(Object.entries(device.capabilities) as Array<[keyof DeviceCapabilities, boolean]>)
                        .filter(([, enabled]) => enabled)
                        .slice(0, 8)
                        .map(([cap]) => {
                          const CapIcon = CAPABILITY_ICONS[cap];
                          return (
                            <div key={cap} className="p-1 rounded bg-cyan-500/5 border border-cyan-500/10" title={CAPABILITY_LABELS[cap]}>
                              <CapIcon className="w-3 h-3 text-cyan-500" />
                            </div>
                          );
                        })}
                      {enabledCaps > 8 && (
                        <span className="text-[10px] text-slate-600 self-center">+{enabledCaps - 8}</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add device card */}
              <button
                onClick={() => setShowInstall(true)}
                className="border-2 border-dashed border-[#1a2845] rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-slate-600 hover:border-cyan-500/30 hover:text-cyan-400 transition-all min-h-[200px]"
              >
                <Download className="w-8 h-8" />
                <span className="text-sm font-medium">Install on a New Device</span>
                <span className="text-xs text-slate-700">View setup instructions for any platform</span>
              </button>
            </div>
          )}
        </div>

        {/* Device detail panel */}
        {selectedDevice && (
          <div className="w-full lg:w-96 border-l border-[#1a2845] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#1a2845]">
              <button onClick={() => setSelectedDevice(null)} className="lg:hidden text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-sm font-bold text-slate-200">Device Details</h3>
              <button onClick={() => setSelectedDevice(null)} className="hidden lg:block text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Device header */}
              <div className="p-5 border-b border-[#1a2845]">
                <div className="flex items-center gap-3 mb-4">
                  {(() => {
                    const Icon = DEVICE_ICONS[selectedDevice.device_type];
                    return (
                      <div className={cn(
                        'p-3 rounded-xl border',
                        selectedDevice.status === 'online' ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-[#0f1830] border-[#1a2845]',
                      )}>
                        <Icon className={cn('w-8 h-8', selectedDevice.status === 'online' ? 'text-cyan-400' : 'text-slate-600')} />
                      </div>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-200 truncate">{selectedDevice.device_name}</h3>
                    <p className="text-xs text-slate-500">{selectedDevice.os} {selectedDevice.os_version}</p>
                  </div>
                </div>

                {/* System stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedDevice.hostname && (
                    <div className="panel p-2.5">
                      <div className="text-slate-600 text-[10px] mb-0.5">Hostname</div>
                      <div className="text-slate-300 font-mono-display truncate">{selectedDevice.hostname}</div>
                    </div>
                  )}
                  {selectedDevice.ip_address && (
                    <div className="panel p-2.5">
                      <div className="text-slate-600 text-[10px] mb-0.5">IP Address</div>
                      <div className="text-slate-300 font-mono-display">{selectedDevice.ip_address}</div>
                    </div>
                  )}
                  {selectedDevice.cpu_percent !== null && (
                    <div className="panel p-2.5">
                      <div className="text-slate-600 text-[10px] mb-0.5 flex items-center gap-1"><Activity className="w-2.5 h-2.5" /> CPU</div>
                      <div className="text-slate-300">{selectedDevice.cpu_percent}%</div>
                    </div>
                  )}
                  {selectedDevice.memory_total_gb !== null && (
                    <div className="panel p-2.5">
                      <div className="text-slate-600 text-[10px] mb-0.5 flex items-center gap-1"><MemoryStick className="w-2.5 h-2.5" /> Memory</div>
                      <div className="text-slate-300">{selectedDevice.memory_used_gb}/{selectedDevice.memory_total_gb} GB</div>
                    </div>
                  )}
                  {selectedDevice.storage_total_gb !== null && (
                    <div className="panel p-2.5">
                      <div className="text-slate-600 text-[10px] mb-0.5 flex items-center gap-1"><HardDrive className="w-2.5 h-2.5" /> Storage</div>
                      <div className="text-slate-300">{selectedDevice.storage_used_gb}/{selectedDevice.storage_total_gb} GB</div>
                    </div>
                  )}
                  {selectedDevice.battery_percent !== null && (
                    <div className="panel p-2.5">
                      <div className="text-slate-600 text-[10px] mb-0.5 flex items-center gap-1"><Battery className="w-2.5 h-2.5" /> Battery</div>
                      <div className="text-slate-300">{selectedDevice.battery_percent}%</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Access level */}
              <div className="p-5 border-b border-[#1a2845]">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Access Level</h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['full', 'limited', 'view_only', 'revoked'] as AccessLevel[]).map((level) => {
                    const cfg = ACCESS_LEVEL_CONFIG[level];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={level}
                        onClick={() => updateAccessLevel(selectedDevice, level)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border',
                          selectedDevice.access_level === level
                            ? cn(cfg.bg, cfg.border, cfg.color)
                            : 'bg-[#0f1830] border-[#1a2845] text-slate-500 hover:text-slate-300',
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Capabilities */}
              <div className="p-5 border-b border-[#1a2845]">
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Device Access & Capabilities</h4>
                </div>
                <div className="space-y-1.5">
                  {(Object.entries(selectedDevice.capabilities) as Array<[keyof DeviceCapabilities, boolean]>).map(([cap, enabled]) => {
                    const CapIcon = CAPABILITY_ICONS[cap];
                    return (
                      <button
                        key={cap}
                        onClick={() => toggleCapability(selectedDevice, cap)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                          enabled ? 'bg-cyan-500/5 border border-cyan-500/15' : 'bg-[#0f1830] border border-[#1a2845]',
                        )}
                      >
                        <CapIcon className={cn('w-4 h-4 flex-shrink-0', enabled ? 'text-cyan-400' : 'text-slate-600')} />
                        <span className={cn('text-sm flex-1 text-left', enabled ? 'text-slate-200' : 'text-slate-500')}>
                          {CAPABILITY_LABELS[cap]}
                        </span>
                        <div className={cn(
                          'w-9 h-5 rounded-full transition-all relative flex-shrink-0',
                          enabled ? 'bg-cyan-500/30' : 'bg-[#1a2845]',
                        )}>
                          <div className={cn(
                            'absolute top-0.5 w-4 h-4 rounded-full transition-all',
                            enabled ? 'left-4 bg-cyan-400' : 'left-0.5 bg-slate-600',
                          )} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="p-5 border-b border-[#1a2845] space-y-2">
                <button
                  onClick={() => toggleDeviceStatus(selectedDevice)}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                    selectedDevice.status === 'online'
                      ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20'
                      : 'bg-green-500/10 border border-green-500/20 text-green-300 hover:bg-green-500/20',
                  )}
                >
                  <Power className="w-4 h-4" />
                  {selectedDevice.status === 'online' ? 'Disconnect Device' : 'Reconnect Device'}
                </button>
                <button
                  onClick={() => removeDevice(selectedDevice)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 transition-all text-sm font-medium"
                >
                  <ShieldOff className="w-4 h-4" /> Remove Device
                </button>
              </div>

              {/* Access log */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Recent Access Activity</h4>
                </div>
                <div className="space-y-2">
                  {accessLogs.length === 0 ? (
                    <p className="text-xs text-slate-600 text-center py-4">No recent activity</p>
                  ) : (
                    accessLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 text-xs">
                        <div className={cn(
                          'w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
                          log.status === 'success' ? 'bg-green-400' : log.status === 'failed' ? 'bg-red-400' : log.status === 'denied' ? 'bg-amber-400' : 'bg-slate-500',
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-300">{log.action.replace(/_/g, ' ')}</p>
                          {log.details && <p className="text-slate-600 text-[10px] mt-0.5">{log.details}</p>}
                          <p className="text-slate-700 text-[10px] mt-0.5">{formatRelativeTime(log.created_at)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Install guide modal */}
      {showInstall && <InstallGuide onClose={() => setShowInstall(false)} />}

      {/* Pairing modal */}
      {showPairing && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg panel animate-slide-up">
            {/* Scan phase */}
            {pairingStep === 'scan' && (
              <div className="p-8 text-center">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                  <div className="absolute inset-3 rounded-full bg-cyan-500/10 flex items-center justify-center">
                    <Radio className="w-8 h-8 text-cyan-400 animate-pulse" />
                  </div>
                  {/* Radar rings */}
                  <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                  <div className="absolute inset-0 rounded-full border border-cyan-500/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                </div>
                <h3 className="text-lg font-bold text-slate-200 mb-2">Scanning for Devices</h3>
                <p className="text-sm text-slate-500 mb-4">Searching your local network for devices with JERVIS installed...</p>
                <div className="flex items-center justify-center gap-2 text-xs text-cyan-400">
                  <Search className="w-3.5 h-3.5 animate-pulse" />
                  <span className="font-mono-display">Scanning 192.168.1.0/24</span>
                </div>
              </div>
            )}

            {/* Found phase — configure */}
            {pairingStep === 'found' && (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                    <Check className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-200">Device Found!</h3>
                    <p className="text-xs text-slate-500">Configure access before connecting</p>
                  </div>
                </div>

                {/* Device type selector */}
                <div className="mb-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 block">Device Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['phone', 'laptop', 'desktop', 'tablet', 'watch', 'tv', 'iot', 'server'] as DeviceType[]).map((type) => {
                      const Icon = DEVICE_ICONS[type];
                      return (
                        <button
                          key={type}
                          onClick={() => selectPairingDeviceType(type)}
                          className={cn(
                            'flex flex-col items-center gap-1 py-2.5 rounded-lg border transition-all',
                            pairingDevice?.device_type === type
                              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                              : 'bg-[#0f1830] border-[#1a2845] text-slate-500 hover:text-slate-300',
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-[10px] capitalize">{type}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Device info */}
                {pairingDevice && (
                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                    <div className="panel p-2.5">
                      <div className="text-slate-600 text-[10px] mb-0.5">IP Address</div>
                      <div className="text-slate-300 font-mono-display">{pairingDevice.ip_address}</div>
                    </div>
                    <div className="panel p-2.5">
                      <div className="text-slate-600 text-[10px] mb-0.5">MAC Address</div>
                      <div className="text-slate-300 font-mono-display text-[10px]">{pairingDevice.mac_address}</div>
                    </div>
                  </div>
                )}

                {/* Capability selection */}
                <div className="mb-5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 block">
                    Grant Access To <span className="text-slate-600 normal-case font-normal">(select what JERVIS can access on this device)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(CAPABILITY_LABELS).map(([cap, label]) => {
                      const CapIcon = CAPABILITY_ICONS[cap as keyof DeviceCapabilities];
                      const selected = pairingCapabilities.has(cap);
                      return (
                        <button
                          key={cap}
                          onClick={() => togglePairingCapability(cap)}
                          className={cn(
                            'flex flex-col items-center gap-1 py-2.5 rounded-lg border transition-all',
                            selected
                              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                              : 'bg-[#0f1830] border-[#1a2845] text-slate-500 hover:text-slate-300',
                          )}
                        >
                          <CapIcon className="w-4 h-4" />
                          <span className="text-[10px]">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowPairing(false); setPairingStep('scan'); }}
                    className="flex-1 py-2.5 rounded-lg bg-[#0f1830] border border-[#1a2845] text-slate-400 hover:text-slate-200 transition-all text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmPairing}
                    disabled={!pairingDevice?.device_type || pairingCapabilities.size === 0}
                    className="flex-1 py-2.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-all text-sm font-bold disabled:opacity-40"
                  >
                    Attach & Grant Access
                  </button>
                </div>
              </div>
            )}

            {/* Connecting phase */}
            {pairingStep === 'connecting' && (
              <div className="p-8 text-center">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                  <div className="absolute inset-3 rounded-full bg-cyan-500/10 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-cyan-400" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-200 mb-2">Establishing Secure Connection</h3>
                <p className="text-sm text-slate-500 mb-4">Pairing with device and encrypting communication channel...</p>
                <div className="space-y-1.5 text-xs font-mono-display text-left max-w-xs mx-auto">
                  <div className="flex items-center gap-2 text-green-400"><Check className="w-3 h-3" /> Handshake complete</div>
                  <div className="flex items-center gap-2 text-green-400"><Check className="w-3 h-3" /> Encryption established</div>
                  <div className="flex items-center gap-2 text-cyan-400"><RefreshCw className="w-3 h-3 animate-spin" /> Granting capabilities...</div>
                </div>
              </div>
            )}

            {/* Connected phase */}
            {pairingStep === 'connected' && (
              <div className="p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center animate-pulse-glow">
                  <ShieldCheck className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-200 mb-2">Device Attached Successfully</h3>
                <p className="text-sm text-slate-500">JERVIS now has access to this device and will manage it remotely.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
