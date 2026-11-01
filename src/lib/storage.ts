import { useState, useCallback } from 'react';
import type { Preferences } from './types';
import { sanitizePreferences, sanitizeRecords } from './persistence.mjs';
export const defaults: Preferences = {
  theme: 'dark',
  accent: '#ff3b4f',
  background: 'glow',
  compact: false,
  showFeatures: true,
  showCards: true,
  fontSize: 16,
  speak: false,
  speechRate: 1,
  language: 'tr-TR',
  model: '',
};
export function useStored<T>(
  key: string,
  initial: T,
): [T, (next: T | ((old: T) => T)) => void, boolean] {
  const [failed, setFailed] = useState(false);
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return initial;
      const parsed = JSON.parse(raw);
      if (key.includes('preferences')) return sanitizePreferences(parsed, initial) as T;
      if (key.includes('history') || key.includes('research'))
        return sanitizeRecords(parsed, key.includes('history') ? 'history' : 'research') as T;
      return parsed;
    } catch {
      return initial;
    }
  });
  const update = useCallback(
    (next: T | ((old: T) => T)) => {
      setValue((old) => {
        const result = typeof next === 'function' ? (next as (old: T) => T)(old) : next;
        try {
          localStorage.setItem(key, JSON.stringify(result));
          setFailed(false);
        } catch {
          setFailed(true);
        }
        return result;
      });
    },
    [key],
  );
  return [value, update, failed];
}
