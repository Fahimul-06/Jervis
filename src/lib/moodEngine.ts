export type Mood = 'happy' | 'calm' | 'focused' | 'energetic' | 'stressed' | 'sad' | 'neutral';

export interface MoodResult {
  mood: Mood;
  confidence: number;
  source: 'chat' | 'voice' | 'schedule' | 'system';
  triggerText: string;
  musicMode: MusicMode;
}

export type MusicMode = 'uplifting' | 'calm_ambient' | 'deep_focus' | 'high_energy' | 'relaxing' | 'melancholic' | 'silence';

interface MoodKeyword {
  mood: Mood;
  words: string[];
  weight: number;
}

const MOOD_KEYWORDS: MoodKeyword[] = [
  { mood: 'happy', words: ['great', 'awesome', 'love', 'excited', 'amazing', 'fantastic', 'perfect', 'yay', 'woohoo', 'excellent', 'wonderful', 'good news', 'approved', 'success', 'celebrate', 'thrilled', 'stoked', 'nice', 'cool', 'sweet'], weight: 1.0 },
  { mood: 'stressed', words: ['stressed', 'overwhelmed', 'deadline', 'urgent', 'too much', 'pressure', 'anxious', 'worried', 'panic', 'rush', 'behind', 'failing', 'broke', 'broken', 'failure', 'failed', 'screwed', 'disaster', 'crisis'], weight: 1.0 },
  { mood: 'sad', words: ['sad', 'depressed', 'unhappy', 'tired', 'exhausted', 'burnt out', 'lonely', 'down', 'bad day', 'terrible', 'awful', 'hate', 'frustrated', 'angry', 'annoyed', 'disappointed', 'rough', 'hard day'], weight: 0.9 },
  { mood: 'focused', words: ['focus', 'work', 'code', 'build', 'project', 'deep work', 'concentrate', 'coding', 'writing', 'architecture', 'design', 'refactor', 'review', 'implement', 'debugging', 'planning'], weight: 0.8 },
  { mood: 'energetic', words: ['energy', 'pumped', 'ready', 'go', 'start', 'sprint', 'launch', 'ship', 'deploy', 'push', 'do this', 'lets go', 'hit it', 'fire', 'boost'], weight: 0.85 },
  { mood: 'calm', words: ['relax', 'calm', 'peaceful', 'quiet', 'rest', 'break', 'chill', 'easy', 'smooth', 'steady', 'morning', 'coffee', 'tea', 'unwind'], weight: 0.7 },
];

const MOOD_MUSIC_MAP: Record<Mood, MusicMode> = {
  happy: 'uplifting',
  calm: 'calm_ambient',
  focused: 'deep_focus',
  energetic: 'high_energy',
  stressed: 'calm_ambient',
  sad: 'melancholic',
  neutral: 'silence',
};

const MOOD_COLORS: Record<Mood, string> = {
  happy: '#f0b429',
  calm: '#10b981',
  focused: '#22d3ee',
  energetic: '#f59e0b',
  stressed: '#ef4444',
  sad: '#6366f1',
  neutral: '#64748b',
};

const MOOD_EMOJIS: Record<Mood, string> = {
  happy: ':)',
  calm: '~',
  focused: '*',
  energetic: '!',
  stressed: '!!',
  sad: ':(',
  neutral: '--',
};

export function getMoodColor(mood: Mood): string {
  return MOOD_COLORS[mood];
}

export function getMoodEmoji(mood: Mood): string {
  return MOOD_EMOJIS[mood];
}

export function detectMood(text: string, source: 'chat' | 'voice' | 'schedule' | 'system' = 'chat'): MoodResult {
  const normalized = text.toLowerCase().trim();
  const hour = new Date().getHours();

  const scores: Partial<Record<Mood, number>> = {};

  for (const entry of MOOD_KEYWORDS) {
    let score = 0;
    for (const word of entry.words) {
      if (normalized.includes(word)) {
        score += entry.weight;
      }
    }
    if (score > 0) {
      scores[entry.mood] = (scores[entry.mood] || 0) + score;
    }
  }

  // Time-of-day baseline influence
  if (hour >= 5 && hour < 10) {
    scores.energetic = (scores.energetic || 0) + 0.15;
    scores.calm = (scores.calm || 0) + 0.1;
  } else if (hour >= 10 && hour < 14) {
    scores.focused = (scores.focused || 0) + 0.15;
  } else if (hour >= 14 && hour < 18) {
    scores.focused = (scores.focused || 0) + 0.1;
    scores.energetic = (scores.energetic || 0) + 0.05;
  } else if (hour >= 18 && hour < 22) {
    scores.calm = (scores.calm || 0) + 0.15;
  } else {
    scores.calm = (scores.calm || 0) + 0.2;
    scores.sad = (scores.sad || 0) + 0.05;
  }

  // Punctuation signals
  if (/[!]{2,}/.test(normalized)) {
    scores.energetic = (scores.energetic || 0) + 0.3;
    scores.happy = (scores.happy || 0) + 0.15;
  }
  if (/\?{2,}/.test(normalized)) {
    scores.stressed = (scores.stressed || 0) + 0.2;
  }
  if (/[.]{3,}|[…]/.test(normalized)) {
    scores.sad = (scores.sad || 0) + 0.2;
    scores.stressed = (scores.stressed || 0) + 0.1;
  }

  // Capital words = excitement or stress
  const capsRatio = (text.match(/[A-Z]{3,}/g) || []).length / Math.max(text.split(' ').length, 1);
  if (capsRatio > 0.1) {
    scores.energetic = (scores.energetic || 0) + 0.2;
    scores.stressed = (scores.stressed || 0) + 0.1;
  }

  // Find top mood
  let topMood: Mood = 'neutral';
  let topScore = 0;
  for (const [mood, score] of Object.entries(scores)) {
    if (score > topScore) {
      topScore = score;
      topMood = mood as Mood;
    }
  }

  const confidence = topScore > 0 ? Math.min(0.95, 0.5 + topScore * 0.15) : 0.4;

  return {
    mood: topMood,
    confidence,
    source,
    triggerText: text,
    musicMode: MOOD_MUSIC_MAP[topMood],
  };
}

export const MUSIC_MODE_NAMES: Record<MusicMode, string> = {
  uplifting: 'Uplifting Melodies',
  calm_ambient: 'Calm Ambient',
  deep_focus: 'Deep Focus',
  high_energy: 'High Energy',
  relaxing: 'Relaxing Waves',
  melancholic: 'Gentle Reflection',
  silence: 'Silent',
};

export const MOOD_NAMES: Record<Mood, string> = {
  happy: 'Happy',
  calm: 'Calm',
  focused: 'Focused',
  energetic: 'Energetic',
  stressed: 'Stressed',
  sad: 'Melancholic',
  neutral: 'Neutral',
};

export function getMoodResponse(mood: Mood): string {
  const responses: Record<Mood, string> = {
    happy: "I can tell you're in a great mood! Let's keep that energy going. Putting on something uplifting for you.",
    calm: "You seem calm and relaxed. I'll play some gentle ambient music to keep that peaceful vibe.",
    focused: "You're in focus mode. I'm switching to deep focus music — minimal distractions, maximum concentration.",
    energetic: "You're fired up! Let's match that energy with some high-tempo beats. Let's get things done!",
    stressed: "I'm picking up that you're feeling stressed. Let me play something calming to help you decompress. Want me to also push back any non-urgent notifications?",
    sad: "I sense you might be feeling down. I'll put on some gentle, reflective music. I'm here if you need to talk or if I can help lighten your load.",
    neutral: "All systems steady. Let me know when you need me — I'm ready when you are.",
  };
  return responses[mood];
}
