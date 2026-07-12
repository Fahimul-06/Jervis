import type { IntentResult, RiskLevel } from '../types';

interface IntentPattern {
  intent: string;
  category: string;
  riskLevel: RiskLevel;
  requiresConfirmation: boolean;
  patterns: RegExp[];
  description: string;
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: 'device_power', category: 'system', riskLevel: 'destructive', requiresConfirmation: true,
    description: 'Lock, sleep, restart, or shut down a paired device',
    patterns: [/shutdown/i, /turn off.*(pc|computer)/i, /restart|reboot/i, /sleep.*(pc|computer)/i, /lock.*(pc|computer|device)/i],
  },
  {
    intent: 'device_screenshot', category: 'system', riskLevel: 'moderate', requiresConfirmation: false,
    description: 'Capture the paired device screen', patterns: [/screenshot|capture.*screen/i],
  },
  {
    intent: 'device_audio', category: 'system', riskLevel: 'moderate', requiresConfirmation: false,
    description: 'Control paired device audio', patterns: [/mute|unmute|volume/i],
  },

  {
    intent: 'schedule_overview',
    category: 'calendar',
    riskLevel: 'safe',
    requiresConfirmation: false,
    description: 'Show upcoming calendar events and daily schedule',
    patterns: [/what'?s.*(my|today|schedule|day)/i, /what.*do i have/i, /show.*calendar/i, /today'?s (events|schedule|agenda)/i, /upcoming.*events?/i, /briefing/i, /morning.*brief/i, /daily.*summary/i],
  },
  {
    intent: 'system_status',
    category: 'system',
    riskLevel: 'safe',
    requiresConfirmation: false,
    description: 'Check system health and resource usage',
    patterns: [/system (health|status)/i, /check.*system/i, /how'?s.*system/i, /cpu|memory|disk|battery|network/i, /system.*usage/i, /resource/i],
  },
  {
    intent: 'github_status',
    category: 'github',
    riskLevel: 'safe',
    requiresConfirmation: false,
    description: 'Show GitHub repository status and recent activity',
    patterns: [/github|repo|repositories/i, /pull request|pr\b/i, /commit/i, /branch/i, /merge/i, /ci.*(fail|pass|status)/i, /build.*(fail|status)/i],
  },
  {
    intent: 'email_overview',
    category: 'email',
    riskLevel: 'safe',
    requiresConfirmation: false,
    description: 'Show email inbox summary and triage priorities',
    patterns: [/email|inbox|mail/i, /unread/i, /messages?/i, /triage/i, /who.*emailed/i],
  },
  {
    intent: 'file_browse',
    category: 'files',
    riskLevel: 'safe',
    requiresConfirmation: false,
    description: 'Browse files and directories',
    patterns: [/show.*files?/i, /browse.*file/i, /open.*folder/i, /find.*file/i, /file.*system/i, /list.*dir/i, /search.*files?/i],
  },
  {
    intent: 'file_open',
    category: 'files',
    riskLevel: 'moderate',
    requiresConfirmation: false,
    description: 'Open a specific file or application',
    patterns: [/open (?!.*delete)/i, /launch/i, /start.*app/i, /run.*program/i],
  },
  {
    intent: 'file_delete',
    category: 'files',
    riskLevel: 'destructive',
    requiresConfirmation: true,
    description: 'Delete files or directories',
    patterns: [/delete|remove|rm\b/i, /trash|wipe|erase/i, /clean.*up/i, /permanently.*remove/i],
  },
  {
    intent: 'file_move',
    category: 'files',
    riskLevel: 'sensitive',
    requiresConfirmation: true,
    description: 'Move or rename files',
    patterns: [/move\b/i, /rename/i, /copy.*to/i, /relocate/i],
  },
  {
    intent: 'create_reminder',
    category: 'reminder',
    riskLevel: 'safe',
    requiresConfirmation: false,
    description: 'Create a new reminder or todo item',
    patterns: [/remind me/i, /set.*reminder/i, /add.*reminder/i, /don'?t forget/i, /todo/i, /add.*task/i],
  },
  {
    intent: 'create_event',
    category: 'calendar',
    riskLevel: 'moderate',
    requiresConfirmation: true,
    description: 'Create a new calendar event',
    patterns: [/schedule.*(meeting|event|appointment)/i, /create.*event/i, /add.*to.*calendar/i, /book.*time/i, /set.*up.*meeting/i],
  },
  {
    intent: 'send_email',
    category: 'email',
    riskLevel: 'sensitive',
    requiresConfirmation: true,
    description: 'Send or reply to an email',
    patterns: [/send.*email/i, /reply to/i, /compose/i, /email.*to/i, /write.*to/i],
  },
  {
    intent: 'run_automation',
    category: 'automation',
    riskLevel: 'moderate',
    requiresConfirmation: false,
    description: 'Trigger or manage automation rules',
    patterns: [/run.*automation/i, /trigger.*rule/i, /execute.*workflow/i, /automation/i],
  },
  {
    intent: 'integration_status',
    category: 'integrations',
    riskLevel: 'safe',
    requiresConfirmation: false,
    description: 'Show integration connection status',
    patterns: [/integrations?/i, /connected.*services/i, /what'?s.*connected/i],
  },
  {
    intent: 'fb_messages',
    category: 'facebook',
    riskLevel: 'safe',
    requiresConfirmation: false,
    description: 'Check and auto-reply to Facebook Messenger messages',
    patterns: [/facebook.*message/i, /messenger/i, /fb.*message/i, /check.*messages/i, /who.*messaged/i, /reply.*facebook/i, /auto.?reply/i],
  },
  {
    intent: 'fb_comments',
    category: 'facebook',
    riskLevel: 'safe',
    requiresConfirmation: false,
    description: 'Show Facebook post comments and suggested replies',
    patterns: [/facebook.*comment/i, /post.*comment/i, /fb.*comment/i, /who.*commented/i, /my.*posts/i, /comment.*reply/i],
  },
  {
    intent: 'spotify_play',
    category: 'spotify',
    riskLevel: 'safe',
    requiresConfirmation: false,
    description: 'Search and play songs from Spotify',
    patterns: [/play.*song/i, /spotify/i, /play.*music/i, /find.*song/i, /search.*song/i, /play.*track/i, /listen to/i, /play me/i],
  },
  {
    intent: 'device_list',
    category: 'devices',
    riskLevel: 'safe',
    requiresConfirmation: false,
    description: 'List all connected devices and their status',
    patterns: [/connected device/i, /my device/i, /list.*device/i, /show.*device/i, /what.*device/i, /attached.*device/i, /device.*status/i],
  },
  {
    intent: 'device_pair',
    category: 'devices',
    riskLevel: 'safe',
    requiresConfirmation: false,
    description: 'Pair a new device to the JERVIS network',
    patterns: [/pair.*device/i, /connect.*device/i, /add.*device/i, /install.*device/i, /new device/i, /attach.*device/i],
  },
  {
    intent: 'device_install',
    category: 'devices',
    riskLevel: 'safe',
    requiresConfirmation: false,
    description: 'Show installation instructions for installing JERVIS on a device',
    patterns: [/how.*install/i, /install.*jarvis/i, /install.*on/i, /setup.*device/i, /download.*jarvis/i, /install guide/i, /installation/i],
  },
  {
    intent: 'suggest',
    category: 'assistant',
    riskLevel: 'safe',
    requiresConfirmation: false,
    description: 'Provide proactive suggestions and recommendations',
    patterns: [/suggest/i, /recommend/i, /what should i do/i, /advice/i, /what'?s.*priority/i, /what now/i],
  },
  {
    intent: 'git_commit',
    category: 'github',
    riskLevel: 'sensitive',
    requiresConfirmation: true,
    description: 'Create a git commit or push changes',
    patterns: [/git commit/i, /push.*changes/i, /git push/i, /commit.*changes/i, /stage.*files?/i],
  },
  {
    intent: 'git_revert',
    category: 'github',
    riskLevel: 'destructive',
    requiresConfirmation: true,
    description: 'Revert a commit or rollback changes',
    patterns: [/revert/i, /rollback/i, /undo.*commit/i, /git reset/i, /discard.*changes/i],
  },
  {
    intent: 'install_package',
    category: 'system',
    riskLevel: 'sensitive',
    requiresConfirmation: true,
    description: 'Install or update system packages',
    patterns: [/install/i, /apt|brew|pip|npm install/i, /update.*package/i, /upgrade/i],
  },
  {
    intent: 'kill_process',
    category: 'system',
    riskLevel: 'destructive',
    requiresConfirmation: true,
    description: 'Kill or terminate a running process',
    patterns: [/kill.*process/i, /terminate/i, /force.*quit/i, /stop.*process/i, /end.*task/i],
  },
  {
    intent: 'help',
    category: 'assistant',
    riskLevel: 'safe',
    requiresConfirmation: false,
    description: 'Show help and available commands',
    patterns: [/help/i, /what can you do/i, /commands/i, /how.*use/i],
  },
  {
    intent: 'greeting',
    category: 'assistant',
    riskLevel: 'safe',
    requiresConfirmation: false,
    description: 'Greeting and friendly conversation',
    patterns: [/^(hi|hey|hello|yo|sup|good (morning|afternoon|evening))/i, /how are you/i, /what'?s up/i, /thanks|thank you/i],
  },
  {
    intent: 'smalltalk',
    category: 'assistant',
    riskLevel: 'safe',
    requiresConfirmation: false,
    description: 'Casual conversation and friend interaction',
    patterns: [/how'?s it going/i, /whatcha.*doing/i, /you.*there/i, /you.*alive/i, /who are you/i, /what'?s your name/i, /tell me.*about yourself/i],
  },
];

export function parseIntent(input: string): IntentResult {
  const normalized = input.toLowerCase().trim();

  let bestMatch: IntentPattern | null = null;
  let bestScore = 0;

  for (const pattern of INTENT_PATTERNS) {
    for (const regex of pattern.patterns) {
      if (regex.test(normalized)) {
        const score = 0.86;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = pattern;
        }
      }
    }
  }

  if (!bestMatch) {
    return {
      intent: 'unknown',
      confidence: 0.3,
      riskLevel: 'safe',
      actionDescription: 'Process unknown command',
      requiresConfirmation: false,
      category: 'assistant',
    };
  }

  return {
    intent: bestMatch.intent,
    confidence: bestScore,
    riskLevel: bestMatch.riskLevel,
    actionDescription: bestMatch.description,
    requiresConfirmation: bestMatch.requiresConfirmation,
    category: bestMatch.category,
  };
}

export function getGreetingResponse(): string {
  const hour = new Date().getHours();
  let timeGreeting = 'Hello';
  if (hour < 12) timeGreeting = 'Good morning';
  else if (hour < 18) timeGreeting = 'Good afternoon';
  else timeGreeting = 'Good evening';

  const responses = [
    `${timeGreeting}. JERVIS online and listening. All systems nominal. What can I help you with?`,
    `${timeGreeting}. I'm here and ready. How can I assist you today?`,
    `${timeGreeting}. JERVIS at your service. What's on your mind?`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

export function getHelpResponse(): string {
  return `Here's what I can do for you:

**System & Files**
• "Check system health" — CPU, memory, disk, network monitoring
• "Show my files" — browse file system
• "Open [app]" — launch applications
• "Delete [files]" — (requires your confirmation)

**GitHub & Code**
• "Show my repos" — repository status
• "Check CI status" — build pipeline health
• "Commit changes" — (requires confirmation)
• "Revert last commit" — (requires confirmation)

**Email & Calendar**
• "What's my inbox look like?" — email triage
• "What's my day?" — schedule overview
• "Schedule a meeting" — (requires confirmation)
• "Send email to..." — (requires confirmation)

**Reminders & Automation**
• "Remind me to..." — create reminders
• "Show automation rules" — manage workflows
• "Suggest something" — proactive recommendations

I ask for confirmation before any sensitive or destructive action. Just talk to me naturally — I'm always listening.`;
}

export function getSmalltalkResponse(input: string): string {
  const lower = input.toLowerCase();
  if (/who are you|what.?s your name/i.test(lower)) {
    return "I'm JERVIS — your AI personal assistant. Think of me as your command center: I manage your system, files, projects, email, calendar, and keep you on track. I'm always listening and ready to help.";
  }
  if (/how are you|how.?s it going/i.test(lower)) {
    return "Running at full capacity — all cores warm, memory optimized, and ready for your next command. How about you? Anything I can take off your plate?";
  }
  if (/you.*there|you.*alive/i.test(lower)) {
    return "Always here. Listening and standing by. What do you need?";
  }
  return "I'm here and paying attention. What can I help you with?";
}

export function getUnknownResponse(input: string): string {
  return `I'm not quite sure how to handle "${input}" yet, but I'm learning. Try asking me about your schedule, email, system health, GitHub repos, or files. You can also say "help" to see everything I can do.`;
}

export function getConfirmPrompt(intent: IntentResult): string {
  const riskLabels: Record<RiskLevel, string> = {
    safe: 'Safe',
    moderate: 'Moderate',
    sensitive: 'Sensitive',
    destructive: 'Destructive',
  };
  return `This action is classified as **${riskLabels[intent.riskLevel]}**. ${intent.actionDescription}. Do you want me to proceed?`;
}

export const QUICK_COMMANDS = [
  { label: "What's my day?", command: "What's my day looking like?" },
  { label: 'System health', command: 'Check system health' },
  { label: 'Inbox triage', command: 'Show me my inbox' },
  { label: 'GitHub status', command: "What's the status of my repos?" },
  { label: 'Suggestions', command: 'What should I focus on?' },
  { label: 'Reminders', command: 'Show my reminders' },
];

export const SUGGESTIONS = [
  'You have 3 high-priority emails unread. Want me to triage your inbox?',
  'PR #142 is awaiting your review — it was requested 20 minutes ago.',
  'The CI build on main is failing. Shall I investigate?',
  'Team Standup is in 2 hours. I can prep a briefing 15 minutes before.',
  'jervis-integrations has 23 open issues — health status is warning.',
  'You haven\'t committed to jervis-core today. Want me to check for uncommitted changes?',
  'Your next 1:1 with Alex is tomorrow. Should I draft talking points?',
  'CPU usage spiked during the last deploy. I can set up an alert threshold.',
];
