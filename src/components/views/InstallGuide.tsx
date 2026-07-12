import { useState } from 'react';
import {
  X, Copy, Check, Download, Terminal, Apple, Monitor, Smartphone,
  Cpu, Globe, Shield, QrCode, ExternalLink, Package,
} from 'lucide-react';
import { cn } from '../../lib/utils';

type Platform = 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'iot';

interface PlatformInfo {
  label: string;
  icon: typeof Monitor;
  color: string;
  methods: InstallMethod[];
}

interface InstallMethod {
  title: string;
  description: string;
  steps: { label: string; command?: string; link?: { label: string; url: string } }[];
  link?: { label: string; url: string };
}

const PAIRING_CODE = 'JRV-7X9-K2D';

const PLATFORMS: Record<Platform, PlatformInfo> = {
  windows: {
    label: 'Windows',
    icon: Monitor,
    color: 'text-blue-400',
    methods: [
      {
        title: 'PowerShell Install (Recommended)',
        description: 'One-command installer via PowerShell',
        steps: [
          { label: 'Open PowerShell as Administrator' },
          { label: 'Run the install command', command: 'iwr -useb https://install.jarvis.ai/ps | iex' },
          { label: 'Wait for installation to complete — JERVIS will auto-launch' },
          { label: 'Enter your pairing code when prompted', command: PAIRING_CODE },
        ],
      },
      {
        title: 'Manual Download',
        description: 'Download the installer directly',
        steps: [
          { label: 'Download the JERVIS installer', link: { label: 'JERVIS-Setup.exe', url: '#' } },
          { label: 'Run JERVIS-Setup.exe as Administrator' },
          { label: 'Follow the setup wizard — accept the default install path' },
          { label: 'Launch JERVIS and enter pairing code', command: PAIRING_CODE },
        ],
      },
      {
        title: 'Winget Package Manager',
        description: 'Install via Windows Package Manager',
        steps: [
          { label: 'Open Command Prompt or PowerShell' },
          { label: 'Install via winget', command: 'winget install JERVIS.JERVISAssistant' },
          { label: 'Launch from Start Menu' },
          { label: 'Enter pairing code', command: PAIRING_CODE },
        ],
      },
    ],
  },
  macos: {
    label: 'macOS',
    icon: Apple,
    color: 'text-slate-300',
    methods: [
      {
        title: 'Homebrew Install (Recommended)',
        description: 'Install via Homebrew package manager',
        steps: [
          { label: 'Open Terminal from Applications > Utilities' },
          { label: 'Add the JERVIS tap and install', command: 'brew tap jarvis/assistant && brew install jarvis' },
          { label: 'Start the JERVIS service', command: 'brew services start jarvis' },
          { label: 'Enter pairing code when the menu bar app appears', command: PAIRING_CODE },
        ],
      },
      {
        title: 'Manual Download',
        description: 'Download the .dmg directly',
        steps: [
          { label: 'Download the JERVIS disk image', link: { label: 'JERVIS.dmg', url: '#' } },
          { label: 'Open JERVIS.dmg and drag JERVIS to Applications' },
          { label: 'Launch JERVIS from Launchpad (right-click > Open on first run)' },
          { label: 'Grant accessibility and microphone permissions when prompted' },
          { label: 'Enter pairing code', command: PAIRING_CODE },
        ],
      },
    ],
  },
  linux: {
    label: 'Linux',
    icon: Terminal,
    color: 'text-amber-400',
    methods: [
      {
        title: 'Curl Install (Recommended)',
        description: 'Universal installer for all distributions',
        steps: [
          { label: 'Open your terminal' },
          { label: 'Run the install script', command: 'curl -fsSL https://install.jarvis.ai/sh | bash' },
          { label: 'Start and enable the JERVIS daemon', command: 'sudo systemctl enable --now jarvis' },
          { label: 'Verify the service is running', command: 'systemctl status jarvis' },
          { label: 'Enter pairing code', command: PAIRING_CODE },
        ],
      },
      {
        title: 'Debian / Ubuntu (APT)',
        description: 'Install via APT package manager',
        steps: [
          { label: 'Add the JERVIS repository key', command: 'wget -qO - https://repo.jarvis.ai/key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/jarvis.gpg' },
          { label: 'Add the repository', command: 'echo "deb [signed-by=/usr/share/keyrings/jarvis.gpg] https://repo.jarvis.ai stable main" | sudo tee /etc/apt/sources.list.d/jarvis.list' },
          { label: 'Update and install', command: 'sudo apt update && sudo apt install jarvis' },
          { label: 'Start the service', command: 'sudo systemctl start jarvis' },
          { label: 'Enter pairing code', command: PAIRING_CODE },
        ],
      },
      {
        title: 'Arch Linux (AUR)',
        description: 'Install from the Arch User Repository',
        steps: [
          { label: 'Install via yay or paru', command: 'yay -S jarvis-assistant' },
          { label: 'Enable and start the service', command: 'sudo systemctl enable --now jarvis' },
          { label: 'Enter pairing code', command: PAIRING_CODE },
        ],
      },
    ],
  },
  ios: {
    label: 'iOS',
    icon: Smartphone,
    color: 'text-slate-200',
    methods: [
      {
        title: 'App Store',
        description: 'Install from the App Store',
        steps: [
          { label: 'Open the App Store on your iPhone or iPad' },
          { label: 'Search for "JERVIS Assistant"', link: { label: 'Open in App Store', url: '#' } },
          { label: 'Tap Get to download and install' },
          { label: 'Open JERVIS and tap "Pair Device"' },
          { label: 'Enter pairing code', command: PAIRING_CODE },
          { label: 'Grant permissions: Notifications, Microphone, Location, Contacts' },
        ],
      },
      {
        title: 'TestFlight Beta',
        description: 'Join the beta program',
        steps: [
          { label: 'Open TestFlight on your device' },
          { label: 'Enter the beta invite code', command: 'JARVIS-BETA-2024' },
          { label: 'Install the beta build' },
          { label: 'Open JERVIS and enter pairing code', command: PAIRING_CODE },
        ],
      },
    ],
  },
  android: {
    label: 'Android',
    icon: Smartphone,
    color: 'text-green-400',
    methods: [
      {
        title: 'Google Play Store',
        description: 'Install from the Play Store',
        steps: [
          { label: 'Open the Google Play Store' },
          { label: 'Search for "JERVIS Assistant"', link: { label: 'Open in Play Store', url: '#' } },
          { label: 'Tap Install' },
          { label: 'Open JERVIS and tap "Pair Device"' },
          { label: 'Enter pairing code', command: PAIRING_CODE },
          { label: 'Grant permissions: Microphone, Location, Contacts, SMS, Notifications' },
        ],
      },
      {
        title: 'APK Direct Download',
        description: 'Sideload the APK directly',
        steps: [
          { label: 'Enable "Install from unknown sources" in Settings > Security' },
          { label: 'Download the JERVIS APK', link: { label: 'JERVIS.apk', url: '#' } },
          { label: 'Open the downloaded APK and tap Install' },
          { label: 'Open JERVIS and enter pairing code', command: PAIRING_CODE },
        ],
      },
      {
        title: 'F-Droid',
        description: 'Install via F-Droid',
        steps: [
          { label: 'Add the JERVIS repository in F-Droid', command: 'https://repo.jarvis.ai/fdroid/repo' },
          { label: 'Search for JERVIS and install' },
          { label: 'Open JERVIS and enter pairing code', command: PAIRING_CODE },
        ],
      },
    ],
  },
  iot: {
    label: 'IoT / Server',
    icon: Cpu,
    color: 'text-cyan-400',
    methods: [
      {
        title: 'Docker Container',
        description: 'Run JERVIS in a container',
        steps: [
          { label: 'Pull the JERVIS image', command: 'docker pull jarvis/assistant:latest' },
          { label: 'Run with access capabilities', command: 'docker run -d --name jarvis --privileged --net=host -e PAIRING_CODE=' + PAIRING_CODE + ' jarvis/assistant:latest' },
          { label: 'Check container status', command: 'docker logs -f jarvis' },
          { label: 'The device will appear in your Connected Devices panel automatically' },
        ],
      },
      {
        title: 'Docker Compose',
        description: 'Deploy with docker-compose',
        steps: [
          { label: 'Create docker-compose.yml', command: 'wget https://install.jarvis.ai/docker-compose.yml' },
          { label: 'Edit the file and set your pairing code', command: 'nano docker-compose.yml' },
          { label: 'Start the container', command: 'docker-compose up -d' },
          { label: 'View logs to confirm pairing', command: 'docker-compose logs -f' },
        ],
      },
      {
        title: 'systemd Service',
        description: 'Install as a Linux system service',
        steps: [
          { label: 'Download the JERVIS binary', command: 'curl -fsSL https://install.jarvis.ai/sh | bash' },
          { label: 'Enable the service', command: 'sudo systemctl enable --now jarvis' },
          { label: 'Set your pairing code', command: 'sudo jarvis pair ' + PAIRING_CODE },
          { label: 'Verify connection', command: 'jarvis status' },
        ],
      },
    ],
  },
};

export function InstallGuide({ onClose }: { onClose: () => void }) {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [methodIdx, setMethodIdx] = useState(0);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  function copy(text: string, idx: number) {
    navigator.clipboard.writeText(text);
    setCopiedStep(idx);
    setTimeout(() => setCopiedStep(null), 2000);
  }

  function copyPairingCode() {
    navigator.clipboard.writeText(PAIRING_CODE);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  const currentPlatform = platform ? PLATFORMS[platform] : null;
  const currentMethod = currentPlatform ? currentPlatform.methods[methodIdx] : null;

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[90vh] panel flex flex-col animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1a2845] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <Download className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-200">Install JERVIS on a Device</h2>
              <p className="text-xs text-slate-500">Choose your platform to get installation instructions</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Pairing code banner */}
          <div className="mx-5 mt-5 p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/5 border border-cyan-500/20 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex-shrink-0">
              <QrCode className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-1">Your device pairing code</p>
              <p className="text-2xl font-bold text-cyan-300 font-mono-display tracking-wider">{PAIRING_CODE}</p>
            </div>
            <button
              onClick={copyPairingCode}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-all text-sm font-medium"
            >
              {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {codeCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Platform selector */}
          {!platform && (
            <div className="p-5">
              <p className="text-sm text-slate-400 mb-4 text-center">Select the platform you want to install JERVIS on:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(Object.entries(PLATFORMS) as Array<[Platform, PlatformInfo]>).map(([key, info]) => {
                  const Icon = info.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => { setPlatform(key); setMethodIdx(0); }}
                      className="flex flex-col items-center gap-3 p-6 rounded-xl bg-[#0f1830] border border-[#1a2845] hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all group"
                    >
                      <div className="p-4 rounded-xl bg-[#1a2845] group-hover:bg-cyan-500/10 transition-colors">
                        <Icon className={cn('w-8 h-8', info.color)} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-200">{info.label}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{info.methods.length} install methods</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Platform instructions */}
          {platform && currentPlatform && currentMethod && (
            <div className="p-5">
              {/* Back + platform header */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setPlatform(null)}
                  className="text-slate-500 hover:text-slate-200 text-sm flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Back to platforms
                </button>
              </div>

              <div className="flex items-center gap-3 mb-5">
                {(() => {
                  const Icon = currentPlatform.icon;
                  return (
                    <div className={cn('p-3 rounded-xl bg-[#1a2845]', currentPlatform.color)}>
                      <Icon className="w-6 h-6" />
                    </div>
                  );
                })()}
                <div>
                  <h3 className="text-base font-bold text-slate-200">Install on {currentPlatform.label}</h3>
                  <p className="text-xs text-slate-500">{currentMethod.description}</p>
                </div>
              </div>

              {/* Method tabs */}
              {currentPlatform.methods.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {currentPlatform.methods.map((m, idx) => (
                    <button
                      key={idx}
                      onClick={() => setMethodIdx(idx)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                        methodIdx === idx
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                          : 'bg-[#0f1830] border-[#1a2845] text-slate-500 hover:text-slate-300',
                      )}
                    >
                      {m.title}
                    </button>
                  ))}
                </div>
              )}

              {/* Steps */}
              <div className="space-y-3">
                {currentMethod.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm text-slate-300 mb-1">{step.label}</p>
                      {step.command && (
                        <div className="flex items-center gap-2 bg-[#070b16] border border-[#1a2845] rounded-lg px-3 py-2 group">
                          <code className="flex-1 text-xs text-cyan-300 font-mono-display break-all">{step.command}</code>
                          <button
                            onClick={() => copy(step.command!, idx)}
                            className="flex-shrink-0 text-slate-500 hover:text-cyan-400 transition-colors"
                          >
                            {copiedStep === idx ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                      {step.link && (
                        <a
                          href={step.link.url}
                          className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 mt-1"
                        >
                          <Package className="w-3.5 h-3.5" /> {step.link.label} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Security note */}
              <div className="mt-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
                <Shield className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-amber-300 font-medium mb-1">Security & Permissions</p>
                  <p className="text-xs text-slate-500">
                    After installation, JERVIS will request access to specific device capabilities based on what you granted during pairing.
                    You can change these at any time from the Connected Devices panel. All access is audit-logged and revocable.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1a2845] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Globe className="w-3.5 h-3.5" />
            <span>Docs: install.jarvis.ai</span>
          </div>
          {platform && (
            <button
              onClick={() => setPlatform(null)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Choose different platform
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
