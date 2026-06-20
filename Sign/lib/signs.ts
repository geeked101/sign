import helloSign from '../assets/signs/hello.json';
import goodSign from '../assets/signs/good.json';
import morningSign from '../assets/signs/morning.json';
import noonSign from '../assets/signs/noon.json';
import afternoonSign from '../assets/signs/afternoon.json';
import eveningSign from '../assets/signs/evening.json';
import nightSign from '../assets/signs/night.json';
import daySign from '../assets/signs/day.json';
import goodMorningSign from '../assets/signs/good-morning.json';
import goodAfternoonSign from '../assets/signs/good-afternoon.json';
import goodEveningSign from '../assets/signs/good-evening.json';
import goodDaySign from '../assets/signs/good-day.json';
import goodNightSign from '../assets/signs/good-night.json';

export type PlaybackUnit = {
  text: string;
  signData: any | null;
  isKnown: boolean;
};

export const SIGNS: Record<string, any> = {
  'hello': helloSign,
  'good': goodSign,
  'morning': morningSign,
  'noon': noonSign,
  'afternoon': afternoonSign,
  'evening': eveningSign,
  'night': nightSign,
  'day': daySign,
  'good morning': goodMorningSign,
  'good afternoon': goodAfternoonSign,
  'good evening': goodEveningSign,
  'good day': goodDaySign,
  'good night': goodNightSign,
};

export function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildPlaybackUnits(inputText: string, signs: Record<string, any> = SIGNS): PlaybackUnit[] {
  const clean = normalizeText(inputText);
  if (!clean) return [];

  const tokens = clean.split(' ').filter(Boolean);
  const phraseTokenLists = Object.keys(signs).map((k) => k.split(' '));
  const maxLen = phraseTokenLists.reduce((m, p) => Math.max(m, p.length), 1);

  const units: PlaybackUnit[] = [];
  let i = 0;
  while (i < tokens.length) {
    let matchedKey: string | null = null;
    let matchedLen = 0;

    for (let len = Math.min(maxLen, tokens.length - i); len >= 1; len--) {
      const key = tokens.slice(i, i + len).join(' ');
      if (signs[key]) {
        matchedKey = key;
        matchedLen = len;
        break;
      }
    }

    if (matchedKey) {
      units.push({ text: matchedKey, signData: signs[matchedKey], isKnown: true });
      i += matchedLen;
    } else {
      const unknown = tokens[i];
      units.push({ text: unknown, signData: null, isKnown: false });
      i += 1;
    }
  }

  return units;
}

export function firstKnownIndex(units: PlaybackUnit[], startIndex: number) {
  for (let i = Math.max(0, startIndex); i < units.length; i++) {
    if (units[i]?.isKnown) return i;
  }
  return -1;
}

