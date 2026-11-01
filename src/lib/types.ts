export type Page =
  | 'home'
  | 'voice'
  | 'research'
  | 'tools'
  | 'tasks'
  | 'history'
  | 'settings'
  | 'personalize'
  | 'privacy'
  | 'about';
export type Preferences = {
  theme: 'dark' | 'light';
  accent: string;
  background: 'glow' | 'plain';
  compact: boolean;
  showFeatures: boolean;
  showCards: boolean;
  fontSize: number;
  speak: boolean;
  speechRate: number;
  language: string;
  model: string;
};
export type Entry = {
  id: string;
  text: string;
  response: string;
  date: string;
  type: string;
  status: 'done' | 'error' | 'unsupported';
};
export type Source = { title: string; url: string; content: string };
export type Research = {
  id: string;
  topic: string;
  status: 'running' | 'done' | 'error' | 'cancelled';
  step: number;
  sources: Source[];
  report: string;
  error?: string;
  date: string;
};
export type Health = {
  provider: string;
  model: string;
  configured: boolean;
  research: boolean;
  desktop: boolean;
};

export type PreferenceUpdate = <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
