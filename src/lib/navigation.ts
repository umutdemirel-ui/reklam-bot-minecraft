import {
  Home,
  Telescope,
  Grid2X2,
  ListTodo,
  History,
  Settings,
  Palette,
  ShieldCheck,
  Info,
  AudioLines,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Page } from './types';
export const navigation: { id: Page; label: string; icon: LucideIcon; badge?: string }[] = [
  { id: 'home', label: 'Ana Sayfa', icon: Home },
  { id: 'voice', label: 'Sesli Asistan', icon: AudioLines },
  { id: 'research', label: 'Derin Araştırma', icon: Telescope, badge: 'BETA' },
  { id: 'tools', label: 'Araçlar', icon: Grid2X2 },
  { id: 'tasks', label: 'Görevler', icon: ListTodo },
  { id: 'history', label: 'Geçmiş', icon: History },
  { id: 'settings', label: 'Ayarlar', icon: Settings },
  { id: 'personalize', label: 'Kişiselleştirme', icon: Palette },
  { id: 'privacy', label: 'Gizlilik ve İzinler', icon: ShieldCheck },
  { id: 'about', label: 'Hakkında', icon: Info },
];
export const suggestions = [
  'Bugün neler yapabilirsin?',
  'Bir fikri birlikte geliştirelim',
  'Bana bir çalışma planı hazırla',
];
export const researchSteps = [
  'Araştırma akışı hazırlanıyor',
  'Web kaynakları toplanıyor',
  'Kaynak özetleri karşılaştırılıyor',
  'Kaynaklı rapor hazırlanıyor',
];
