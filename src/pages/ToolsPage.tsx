import {
  Mic,
  Telescope,
  ArrowUpRight,
  Monitor,
  Globe,
  FolderSearch,
  AppWindow,
  LockKeyhole,
  Terminal,
} from 'lucide-react';
import { Button } from '../components/ui';
import type { Health, Page } from '../lib/types';

type Props = {
  health: Health | null;
  speechSupported: boolean;
  navigate: (page: Page) => void;
  prepareCommand: (text: string) => void;
};
export default function ToolsPage({ health, speechSupported, navigate, prepareCommand }: Props) {
  return (
    <>
      <div className="notice">
        <Monitor size={18} />
        <span>
          <strong>Şu anda web istemcisindesiniz.</strong> Yerel program açma, dosya arama ve işletim
          sistemi kontrolü bu sürümde yok. Masaüstü bağdaştırıcısı henüz geliştirilmedi.
        </span>
      </div>
      <div className="tools-grid">
        {[
          {
            icon: Globe,
            title: 'Web araması',
            text: 'Sorunuzu tarayıcıda arayın. Sonuçlar yeni sekmede açılır.',
            tag: 'Kullanılabilir',
            enabled: true,
            action: () => prepareCommand('İnternette ara '),
          },
          {
            icon: Telescope,
            title: 'Derin araştırma',
            text: 'Web kaynaklarından alıntılı araştırma özeti. Model ve SearXNG bağlantısı gerektirir.',
            tag: health?.research ? 'Yapılandırıldı' : 'Kurulum gerekli',
            enabled: true,
            action: () => navigate('research'),
          },
          {
            icon: Mic,
            title: 'Türkçe ses tanıma',
            text: 'Tarayıcı destekliyorsa konuşmayı gerçek zamanlı metne dönüştürün.',
            tag: speechSupported ? 'Tarayıcı destekliyor' : 'Desteklenmiyor',
            enabled: speechSupported,
            action: () => navigate('voice'),
          },
          {
            icon: AppWindow,
            title: 'Uygulama kontrolü',
            text: 'Program açma ve kapatma için yerel ve izinli masaüstü entegrasyonu gerekir.',
            tag: 'Henüz geliştirilmedi',
            enabled: false,
          },
          {
            icon: FolderSearch,
            title: 'Dosya ve klasör arama',
            text: 'Cihazınızın dosya sistemine erişim yok. Dosyalarınız taranmaz.',
            tag: 'Henüz geliştirilmedi',
            enabled: false,
          },
          {
            icon: Terminal,
            title: 'Sistem otomasyonu',
            text: 'İşletim sistemi komutları ve çok adımlı yerel görevler şu an desteklenmez.',
            tag: 'Henüz geliştirilmedi',
            enabled: false,
          },
        ].map((t) => (
          <article className={`panel tool-card ${!t.enabled ? 'disabled-tool' : ''}`} key={t.title}>
            <div className="tool-top">
              <span className="tool-icon">
                <t.icon size={23} strokeWidth={1.4} />
              </span>
              <span className={`capability ${t.enabled ? 'available' : 'unavailable'}`}>
                {t.tag}
              </span>
            </div>
            <h2>{t.title}</h2>
            <p>{t.text}</p>
            <Button secondary disabled={!t.enabled} onClick={t.action}>
              {t.enabled ? 'Aracı aç' : 'Planlanan yetenek'}
              {t.enabled ? <ArrowUpRight size={14} /> : <LockKeyhole size={13} />}
            </Button>
          </article>
        ))}
      </div>
    </>
  );
}
