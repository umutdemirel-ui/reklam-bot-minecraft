import { useState } from 'react';
import { Button } from './ui';
import { api } from '../lib/client';
import type { Preferences, Entry } from '../lib/types';
import { defaults } from '../lib/storage';
import { sanitizePreferences, sanitizeRecords } from '../lib/persistence.mjs';
export default function SyncPanel({
  prefs,
  history,
  restore,
}: {
  prefs: Preferences;
  history: Entry[];
  restore: (p: Preferences, h: Entry[]) => void;
}) {
  const [revision, setRevision] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'upload' | 'download' | 'delete' | null>(null);
  async function act(action: 'inspect' | 'upload' | 'download' | 'delete') {
    setBusy(true);
    try {
      if (action === 'inspect') {
        const d = await api('/api/workspace');
        setRevision(d.revision);
        setMessage(`Sunucu sürümü ${d.revision}. Veriler henüz bu cihaza uygulanmadı.`);
      } else if (action === 'upload') {
        if (revision === null) throw Error('Önce sunucu sürümünü kontrol edin.');
        const d = await api('/api/workspace', { revision, preferences: prefs, history });
        setRevision(d.revision);
        setMessage('Tercihler ve komut geçmişi sunucuya gönderildi.');
      } else if (action === 'download') {
        const d = await api('/api/workspace');
        restore(
          sanitizePreferences(d.preferences, defaults) as Preferences,
          sanitizeRecords(d.history, 'history') as Entry[],
        );
        setRevision(d.revision);
        setMessage('Sunucudaki tercihler ve geçmiş bu tarayıcıya uygulandı.');
      } else {
        await api('/api/workspace/delete', {});
        setRevision(null);
        setMessage('Sunucudaki senkronizasyon kopyası silindi. Yerel veriler korunuyor.');
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }
  return (
    <section className="panel">
      <div className="panel-title">
        <h2>Cihazlar arası aktarım</h2>
        <span className="small-tag">İsteğe bağlı · Tek sahip</span>
      </div>
      <p className="panel-description">
        Aynı sunucuya oturum açan cihazlar tercihleri ve son 100 komutu elle eşitleyebilir. Otomatik
        eşitleme ve uçtan uca şifreleme yoktur. Sunucu yöneticisi kayıtlara erişebilir; hassas
        geçmişi göndermeyin. Araştırmalar zaten sunucudaki görevlerde saklanır.
      </p>
      <div className="button-row">
        <Button secondary disabled={busy} onClick={() => void act('inspect')}>
          Sunucu sürümünü kontrol et
        </Button>
        <Button secondary disabled={busy || revision === null} onClick={() => setConfirm('upload')}>
          Bu cihazdan gönder
        </Button>
        <Button secondary disabled={busy} onClick={() => setConfirm('download')}>
          Sunucudan al
        </Button>
        <Button secondary disabled={busy} onClick={() => setConfirm('delete')}>
          Sunucu kopyasını sil
        </Button>
      </div>
      {confirm && (
        <div className="notice warning">
          <span>
            {confirm === 'download'
              ? 'Bu cihazdaki tercihler ve geçmiş sunucudaki kopyayla değiştirilecek.'
              : confirm === 'upload'
                ? 'Komut geçmişiniz sunucuya kopyalanacak; mevcut sunucu kopyası değişecek.'
                : 'Sunucudaki eşitleme kopyası silinecek. Geri alınamaz.'}
            <div className="button-row">
              <Button disabled={busy} onClick={() => void act(confirm)}>
                Onayla
              </Button>
              <Button secondary onClick={() => setConfirm(null)}>
                Vazgeç
              </Button>
            </div>
          </span>
        </div>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <Button
        secondary
        onClick={async () => {
          await api('/api/session/logout', {});
          location.reload();
        }}
      >
        Oturumu kapat
      </Button>
    </section>
  );
}
