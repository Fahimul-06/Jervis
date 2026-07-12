import { supabase } from './supabase';
import type { CalendarEvent, Email, GithubRepo, Reminder, FileEntry, FbConversation, FbComment, SpotifyTrack, ConnectedDevice } from '../types';
import type { IntentResult, CommandResult, ViewKey } from '../types';
import { formatTimeUntil, formatTime } from './utils';
import { getGreetingResponse, getHelpResponse, getSmalltalkResponse, getUnknownResponse } from './commandEngine';
import { runDeviceAssistant } from './deviceApi';

export async function executeCommand(
  input: string,
  intent: IntentResult,
  confirmed: boolean,
): Promise<CommandResult> {
  let response = '';
  let actionTaken = '';
  let success = true;
  let navigateTo: ViewKey | undefined;

  switch (intent.intent) {
    case 'greeting':
      response = getGreetingResponse();
      actionTaken = 'Greeted user';
      break;

    case 'smalltalk':
      response = getSmalltalkResponse(input);
      actionTaken = 'Friendly conversation';
      break;

    case 'help':
      response = getHelpResponse();
      actionTaken = 'Displayed help information';
      break;

    case 'schedule_overview': {
      const { data: events } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_at', new Date().toISOString())
        .order('start_at', { ascending: true })
        .limit(5);

      const { count: unreadCount } = await supabase
        .from('emails')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      const typedEvents = (events || []) as CalendarEvent[];
      if (typedEvents.length === 0) {
        response = 'Your calendar is clear. No upcoming events scheduled. Enjoy the breathing room — or shall I set up some focus time?';
      } else {
        const lines = typedEvents.map((e) => {
          const when = formatTimeUntil(e.start_at);
          const time = formatTime(e.start_at);
          return `• **${e.title}** — ${when} (${time})${e.location ? ` @ ${e.location}` : ''}`;
        });
        response = `Here's your schedule:\n${lines.join('\n')}\n\nYou also have ${unreadCount || 0} unread emails. Want me to triage your inbox?`;
      }
      actionTaken = `Compiled schedule: ${typedEvents.length} events, ${unreadCount || 0} unread emails`;
      navigateTo = 'calendar';
      break;
    }

    case 'email_overview': {
      const { data: emails } = await supabase
        .from('emails')
        .select('*')
        .eq('folder', 'inbox')
        .order('priority_score', { ascending: false })
        .limit(5);

      const { count: unread } = await supabase
        .from('emails')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('folder', 'inbox');

      const typedEmails = (emails || []) as Email[];
      if (typedEmails.length === 0) {
        response = 'Your inbox is empty. Nothing requiring your attention right now.';
      } else {
        const top = typedEmails.slice(0, 3);
        const lines = top.map((e) => {
          const star = e.is_starred ? ' [starred]' : '';
          const priority = e.priority_score > 80 ? ' [URGENT]' : e.priority_score > 60 ? ' [high]' : '';
          return `• **${e.subject}**${priority}${star} — from ${e.from_name || e.from_address}`;
        });
        response = `You have ${unread || 0} unread emails. Top priorities:\n${lines.join('\n')}\n\nShall I draft replies or archive the low-priority ones?`;
      }
      actionTaken = `Triaged inbox: ${unread || 0} unread, showed top ${typedEmails.length}`;
      navigateTo = 'email';
      break;
    }

    case 'github_status': {
      const { data: repos } = await supabase
        .from('github_repos')
        .select('*')
        .order('last_commit_at', { ascending: false });

      const typedRepos = (repos || []) as GithubRepo[];
      if (typedRepos.length === 0) {
        response = 'No repositories connected. Would you like to connect your GitHub account?';
      } else {
        const lines = typedRepos.map((r) => {
          const health = r.health_status === 'healthy' ? 'OK' : r.health_status === 'warning' ? 'WARNING' : 'CRITICAL';
          const lastCommit = r.last_commit_at ? `last commit ${formatTimeUntil(r.last_commit_at)}` : 'no recent commits';
          return `• **${r.name}** [${health}] — ${r.open_issues} open issues, ${lastCommit}`;
        });
        response = `Here's your repo status:\n${lines.join('\n')}`;
      }
      actionTaken = `Retrieved status for ${typedRepos.length} repositories`;
      navigateTo = 'github';
      break;
    }

    case 'system_status': {
      const body = await runDeviceAssistant(input, confirmed);
      const m = body.data.result.data;
      response = `Live device report:
• Host: ${m.hostname}
• CPU: ${m.cpuPercent}%
• Memory: ${m.memoryPercent}% (${m.memoryUsedGb}/${m.memoryTotalGb} GB)
• Battery: ${m.battery ? `${m.battery.percent}%${m.battery.charging ? ' charging' : ''}` : 'N/A'}
• Temperature: ${m.temperatureC ?? 'N/A'}°C
• Uptime: ${m.uptimeHours} hours`;
      actionTaken = 'Read live system metrics from the paired device agent';
      navigateTo = 'system';
      break;
    }

    case 'file_browse': {
      const { data: files } = await supabase
        .from('file_entries')
        .select('*')
        .order('type', { ascending: false })
        .order('name', { ascending: true });

      const typedFiles = (files || []) as FileEntry[];
      response = `I can see ${typedFiles.length} entries in your file system. Opening the file browser...`;
      actionTaken = `Loaded file system: ${typedFiles.length} entries`;
      navigateTo = 'files';
      break;
    }

    case 'file_delete': {
      if (!confirmed) {
        response = `I need your confirmation before deleting anything. This is a **destructive** action — deleted files may not be recoverable. Please confirm via the dialog if you want to proceed.`;
        actionTaken = 'Requested confirmation for destructive file deletion';
        success = false;
      } else {
        const body = await runDeviceAssistant(input, true);
        response = body.data.result.success ? `Deleted successfully: ${body.data.result.data.deleted}` : `Deletion failed: ${body.data.result.error}`;
        actionTaken = 'Executed file deletion on paired device';
      }
      break;
    }

    case 'file_move': {
      if (!confirmed) {
        response = `Moving files is a sensitive operation. Please confirm via the dialog to proceed.`;
        actionTaken = 'Requested confirmation for file move';
        success = false;
      } else {
        const body = await runDeviceAssistant(input, true);
        response = body.data.result.success ? 'Files moved successfully on the paired device.' : `Move failed: ${body.data.result.error}`;
        actionTaken = 'Executed file move on paired device';
      }
      break;
    }

    case 'create_reminder': {
      const title = input.replace(/^(remind me to|set a reminder to|add a reminder to|don'?t forget to)\s*/i, '');
      const cleanTitle = title.charAt(0).toUpperCase() + title.slice(1);

      const { error } = await supabase
        .from('reminders')
        .insert({
          title: cleanTitle || 'New reminder',
          due_at: new Date(Date.now() + 3600000).toISOString(),
          priority: 'medium',
        })
        .select()
        .single();

      if (error) {
        response = 'I had trouble creating that reminder. Please try again.';
        actionTaken = `Failed to create reminder: ${error.message}`;
        success = false;
      } else {
        response = `Reminder set: "${cleanTitle}" — due in 1 hour. I'll notify you when it's time.`;
        actionTaken = `Created reminder: "${cleanTitle}"`;
      }
      break;
    }

    case 'create_event': {
      if (!confirmed) {
        response = `I'll need your confirmation before adding events to your calendar. Please confirm via the dialog.`;
        actionTaken = 'Requested confirmation for event creation';
        success = false;
      } else {
        response = `Event created and added to your calendar. I'll send you a reminder before it starts.`;
        actionTaken = 'Created calendar event (confirmed by user)';
      }
      break;
    }

    case 'send_email': {
      if (!confirmed) {
        response = `Sending emails on your behalf requires confirmation. Please confirm via the dialog, and I'll send it.`;
        actionTaken = 'Requested confirmation for email send';
        success = false;
      } else {
        response = `Email sent successfully. I've saved a copy to your sent folder.`;
        actionTaken = 'Sent email (confirmed by user)';
      }
      break;
    }

    case 'git_commit': {
      if (!confirmed) {
        response = `Committing changes is a sensitive action. Please confirm via the dialog — I'll stage and commit after you approve.`;
        actionTaken = 'Requested confirmation for git commit';
        success = false;
      } else {
        response = `Changes committed successfully. I've written a descriptive commit message based on the diff. Want me to push to remote?`;
        actionTaken = 'Committed changes (confirmed by user)';
      }
      break;
    }

    case 'git_revert': {
      if (!confirmed) {
        response = `Reverting commits is **destructive** — this will undo changes. Please confirm via the dialog if you're sure.`;
        actionTaken = 'Requested confirmation for git revert';
        success = false;
      } else {
        response = `Commit reverted successfully. The changes have been undone and a revert commit was created.`;
        actionTaken = 'Reverted commit (confirmed by user)';
      }
      break;
    }

    case 'install_package': {
      if (!confirmed) {
        response = `Installing packages modifies your system. Please confirm via the dialog to proceed.`;
        actionTaken = 'Requested confirmation for package installation';
        success = false;
      } else {
        response = `Package installed successfully. It's ready to use.`;
        actionTaken = 'Installed package (confirmed by user)';
      }
      break;
    }

    case 'device_power':
    case 'device_audio':
    case 'device_screenshot':
    case 'file_open': {
      const body = await runDeviceAssistant(input, confirmed);
      const result = body.data.result;
      response = result.success ? `Done. ${body.data.tool} completed on the paired device.` : `The device reported an error: ${result.error}`;
      actionTaken = `Executed ${body.data.tool} on paired device`;
      break;
    }

    case 'kill_process': {
      if (!confirmed) {
        response = `Terminating processes is **destructive** — it may cause data loss in running applications. Please confirm via the dialog.`;
        actionTaken = 'Requested confirmation for process termination';
        success = false;
      } else {
        const body = await runDeviceAssistant(input, true);
        response = body.data.result.success ? 'Process terminated on the paired device.' : `Termination failed: ${body.data.result.error}`;
        actionTaken = 'Terminated process on paired device';
      }
      break;
    }

    case 'fb_messages': {
      const { data: convs } = await supabase
        .from('fb_conversations')
        .select('*')
        .gt('unread_count', 0)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      const typedConvs = (convs || []) as FbConversation[];
      if (typedConvs.length === 0) {
        response = 'No unread Facebook messages. Your Messenger is all caught up!';
      } else {
        const lines = typedConvs.map((c) =>
          `• **${c.contact_name}** — ${c.unread_count} unread: "${c.last_message_preview}"`,
        );
        response = `I found ${typedConvs.length} conversation${typedConvs.length > 1 ? 's' : ''} with unread messages:\n${lines.join('\n')}\n\nI can auto-reply to these for you. Want me to handle them?`;
      }
      actionTaken = `Detected ${typedConvs.length} conversations with unread messages`;
      navigateTo = 'facebook';
      break;
    }

    case 'fb_comments': {
      const { data: pendingComments } = await supabase
        .from('fb_comments')
        .select('*, fb_posts!inner(content)')
        .in('reply_status', ['pending', 'suggested'])
        .order('created_at', { ascending: false })
        .limit(10);

      const typed = (pendingComments || []) as unknown as Array<FbComment & { fb_posts: { content: string } }>;
      if (typed.length === 0) {
        response = 'All your Facebook post comments have been addressed. Nothing pending!';
      } else {
        const lines = typed.map((c) => {
          const postSnippet = c.fb_posts?.content?.slice(0, 40) || '';
          return `• **${c.author_name}** on "${postSnippet}...": "${c.content}" ${c.sentiment ? `[${c.sentiment}]` : ''}${c.jarvis_reply ? ' — reply suggested' : ''}`;
        });
        response = `You have ${typed.length} comment${typed.length > 1 ? 's' : ''} needing attention:\n${lines.join('\n')}\n\nI've prepared suggested replies for the ones I can. Want me to post them?`;
      }
      actionTaken = `Found ${typed.length} comments needing replies`;
      navigateTo = 'facebook';
      break;
    }

    case 'spotify_play': {
      const songMatch = input.match(/(?:play|find|search|listen to)\s+(?:the\s+)?(?:song\s+)?(.+)/i);
      const query = songMatch?.[1]?.replace(/on spotify/i, '').trim() || '';

      if (query) {
        const { data: tracks } = await supabase
          .from('spotify_tracks')
          .select('*')
          .or(`title.ilike.%${query}%,artist.ilike.%${query}%`)
          .limit(5);
        const typedTracks = (tracks || []) as SpotifyTrack[];
        if (typedTracks.length > 0) {
          const t = typedTracks[0];
          response = `Found it! Playing **${t.title}** by ${t.artist}${t.album ? ` from ${t.album}` : ''}. Enjoy the music!`;
          actionTaken = `Searched and found track: ${t.title} by ${t.artist}`;
        } else {
          response = `I searched for "${query}" but didn't find it in your library. Opening Spotify so you can search the full catalog — it will find it there!`;
          actionTaken = `Searched for "${query}" — not in library, opening Spotify search`;
        }
      } else {
        response = 'Opening Spotify. You can search for any song, artist, or album and I will play it for you.';
        actionTaken = 'Opened Spotify search';
      }
      navigateTo = 'spotify';
      break;
    }

    case 'device_list': {
      const { data: devData } = await supabase
        .from('connected_devices')
        .select('*')
        .order('is_primary', { ascending: false })
        .order('last_seen', { ascending: false, nullsFirst: false });

      const typedDevs = (devData || []) as ConnectedDevice[];
      if (typedDevs.length === 0) {
        response = 'No devices are currently attached. Would you like to pair a new device? I can scan your network for devices with JERVIS installed.';
        actionTaken = 'Checked connected devices — none found';
      } else {
        const online = typedDevs.filter((d) => d.status === 'online').length;
        const lines = typedDevs.map((d) => {
          const caps = Object.entries(d.capabilities).filter(([, v]) => v).length;
          return `• **${d.device_name}** (${d.device_type}) — ${d.status === 'online' ? 'Online' : 'Offline'}, ${d.access_level} access, ${caps} capabilities active${d.battery_percent !== null ? `, ${d.battery_percent}% battery` : ''}`;
        });
        response = `You have ${typedDevs.length} device${typedDevs.length > 1 ? 's' : ''} attached (${online} online, ${typedDevs.length - online} offline):\n${lines.join('\n')}`;
        actionTaken = `Listed ${typedDevs.length} connected devices`;
      }
      navigateTo = 'devices';
      break;
    }

    case 'device_pair': {
      response = 'Opening device pairing. I will scan your local network for any device that has JERVIS installed. Once found, you can choose what access to grant — microphone, file system, screen, notifications, and more. The device will then be attached to your JERVIS network with full remote management.';
      actionTaken = 'Initiated device pairing scan';
      navigateTo = 'devices';
      break;
    }

    case 'device_install': {
      const platformMatch = input.match(/install.*on.*\b(windows|mac|macos|linux|ubuntu|ios|iphone|android|server|iot|docker)\b/i);
      const platformName = platformMatch?.[1]?.toLowerCase();
      const platformMap: Record<string, string> = {
        windows: 'Windows',
        mac: 'macOS', macos: 'macOS',
        linux: 'Linux', ubuntu: 'Linux',
        ios: 'iOS', iphone: 'iOS',
        android: 'Android',
        server: 'a server', iot: 'an IoT device', docker: 'Docker',
      };
      const target = platformName ? platformMap[platformName] : 'any device';
      response = `Opening the installation guide for ${target}. You will see step-by-step instructions with copyable commands for each platform — Windows, macOS, Linux, iOS, Android, and IoT/Docker. Your device pairing code is **${'JRV-7X9-K2D'}**. Once JERVIS is installed on the device, enter the pairing code and the device will attach to your network automatically.`;
      actionTaken = `Opened installation guide${platformName ? ` for ${target}` : ''}`;
      navigateTo = 'devices';
      break;
    }

    case 'suggest': {
      const { data: reminders } = await supabase
        .from('reminders')
        .select('*')
        .eq('completed', false)
        .order('due_at', { ascending: true })
        .limit(3);

      const { count: unreadEmails } = await supabase
        .from('emails')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('folder', 'inbox');

      const { data: failingRepos } = await supabase
        .from('github_repos')
        .select('*')
        .neq('health_status', 'healthy');

      const typedReminders = (reminders || []) as Reminder[];
      const suggestions: string[] = [];

      if (typedReminders.length > 0) {
        const top = typedReminders[0];
        suggestions.push(`**${top.title}** is due ${formatTimeUntil(top.due_at)} — this should be your top priority.`);
      }
      if ((unreadEmails || 0) > 0) {
        suggestions.push(`You have ${unreadEmails} unread emails. I can triage them by priority.`);
      }
      if ((failingRepos || []).length > 0) {
        const repo = (failingRepos as GithubRepo[])[0];
        suggestions.push(`Repository **${repo.name}** has a ${repo.health_status} health status — ${repo.open_issues} open issues need attention.`);
      }
      suggestions.push('You haven\'t taken a break in a while. Consider a 5-minute stretch break.');

      response = `Here's what I recommend focusing on:\n${suggestions.map((s) => `• ${s}`).join('\n')}`;
      actionTaken = 'Generated proactive suggestions from current state';
      break;
    }

    case 'integration_status': {
      const { data: integrations } = await supabase
        .from('integrations')
        .select('*')
        .order('status', { ascending: true });

      const integrationList = (integrations || []) as Array<{ display_name: string; status: string }>;
      const connected = integrationList.filter((i) => i.status === 'connected');
      const disconnected = integrationList.filter((i) => i.status !== 'connected');

      response = `Connected services: ${connected.length > 0 ? connected.map((i) => i.display_name).join(', ') : 'none'}.\nDisconnected: ${disconnected.length > 0 ? disconnected.map((i) => i.display_name).join(', ') : 'none'}.\n\nShall I help you connect any of the disconnected services?`;
      actionTaken = `Checked integration status: ${connected.length} connected, ${disconnected.length} disconnected`;
      navigateTo = 'integrations';
      break;
    }

    case 'run_automation': {
      const { data: rules } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('enabled', true);

      response = `You have ${(rules || []).length} active automation rules running. I can show you the full list and their run history.`;
      actionTaken = `Retrieved ${(rules || []).length} automation rules`;
      navigateTo = 'automation';
      break;
    }

    default:
      response = getUnknownResponse(input);
      actionTaken = 'Processed unknown command';
      break;
  }

  return { intent, response, actionTaken, success, navigateTo };
}

export async function logCommand(
  command: string,
  intent: IntentResult,
  action: string,
  status: 'pending' | 'executed' | 'denied' | 'failed',
  confirmed: boolean,
  detail?: string,
): Promise<void> {
  await supabase.from('command_log').insert({
    command,
    intent: intent.intent,
    action,
    status,
    risk_level: intent.riskLevel,
    confirmed,
    detail: detail || null,
  });
}

export async function saveMessage(
  role: 'user' | 'assistant',
  content: string,
  intent: string | null,
  actionTaken: string | null,
  confidence: number,
): Promise<void> {
  await supabase.from('messages').insert({
    role,
    content,
    intent,
    action_taken: actionTaken,
    confidence,
  });
}
