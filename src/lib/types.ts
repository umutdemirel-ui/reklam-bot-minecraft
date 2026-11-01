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
  rememberContext: boolean;
  sttMode: 'browser' | 'local';
  ttsMode: 'browser' | 'local';
  microphoneId: string;
  hiddenPages: Page[];
  cardOrder: number[];
};
export type Entry = {
  id: string;
  text: string;
  response: string;
  date: string;
  type: string;
  status: 'done' | 'error' | 'unsupported';
};
export type Source = {
  title: string;
  url: string;
  content: string;
  mode?: 'summary' | 'full';
  accessedAt?: string;
  readError?: string;
};
export type Research = {
  id: string;
  topic: string;
  status: 'queued' | 'running' | 'done' | 'error' | 'cancelled' | 'interrupted';
  step: number;
  sources: Source[];
  report: string;
  plan?: { goal: string; questions: string[]; queries: string[] };
  message?: string;
  findings?: { claim: string; sourceIds: number[]; quote: string; quoteVerified: boolean }[];
  error?: string;
  date: string;
};
export type Health = {
  provider: string;
  model: string;
  rememberContext: boolean;
  sttMode: 'browser' | 'local';
  ttsMode: 'browser' | 'local';
  microphoneId: string;
  hiddenPages: Page[];
  cardOrder: number[];
  configured: boolean;
  research: boolean;
  desktop: boolean;
  durableJobs?: boolean;
  localStt?: boolean;
  localTts?: boolean;
  auth?: boolean;
};

export type PreferenceUpdate = <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
