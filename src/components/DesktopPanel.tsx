import { useEffect, useState } from 'react';
import { Button } from './ui';
import type { DesktopCapabilities } from '../lib/desktop';
export default function DesktopPanel() {
  const [capabilities, setCapabilities] = useState<DesktopCapabilities | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ name: string; path: string; kind: string }[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState('sound');
  const [appId, setAppId] = useState('');
  const [steps, setSteps] = useState<
    { action: string; input: object; label: string; status: string }[]
  >([]);
  useEffect(() => {
    window.prometheusDesktop
      ?.capabilities()
      .then(setCapabilities)
      .catch(() => setMessage('Masaüstü bağlantısı kurulamadı.'));
  }, []);
  if (!window.prometheusDesktop)
    return (
      <section className="panel" id="desktop-tools">
        <h2>Yerel bilgisayar araçları</h2>
        <p className="panel-description">
          Bu tarayıcının bilgisayar kontrol yetkisi yok. Yerel istemciyi{' '}
          <code>npm run desktop</code> ile başlatın. Electron istemcisinde uygulama ve klasör
          izinleri native dosya seçiciyle verilir; her açma/kapatma için native onay istenir.
        </p>
      </section>
    );
  async function execute(action: string, input: object = {}) {
    setBusy(true);
    try {
      const d = await window.prometheusDesktop!.execute(action, input);
      if (action === 'find') {
        setResults(d.results || []);
        setMessage(
          d.truncated
            ? 'Tarama sınırına ulaşıldı; sonuçlar kısmi.'
            : `${d.results?.length || 0} eşleşme bulundu.`,
        );
      } else setMessage(d.cancelled ? 'İşlem iptal edildi.' : d.message || 'İşlem tamamlandı.');
      setCapabilities(await window.prometheusDesktop!.capabilities());
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel" id="desktop-tools">
      <div className="panel-title">
        <h2>İzinli masaüstü araçları</h2>
        <span className="small-tag">{capabilities?.platform}</span>
      </div>
      <p className="panel-description">
        Keyfi terminal komutu, silme veya doğrudan sistem ayarı değiştirme aracı yoktur. Yalnızca
        seçtiğiniz uygulamalar ve klasörler kullanılır. macOS'ta uygulama kapatma desteklenmez;
        diğer platformlarda yalnız bu oturumda başlatılan süreç kapatılır.
      </p>
      <div className="button-row">
        <Button disabled={busy} onClick={() => void execute('grantApplication')}>
          Uygulamaya izin ver
        </Button>
        <Button secondary disabled={busy} onClick={() => void execute('grantDirectory')}>
          Arama klasörü seç
        </Button>
      </div>
      {capabilities?.applications.map((a) => (
        <div className="native-row" key={a.id}>
          <strong>{a.name}</strong>
          <Button
            secondary
            disabled={busy}
            onClick={() => void execute('openApplication', { id: a.id })}
          >
            Aç
          </Button>
          <Button
            secondary
            disabled={busy || !capabilities.running.includes(a.id)}
            onClick={() => void execute('closeApplication', { id: a.id })}
          >
            Kapat
          </Button>
          <Button secondary disabled={busy} onClick={() => void execute('revoke', { id: a.id })}>
            İzni kaldır
          </Button>
        </div>
      ))}
      {capabilities?.roots.map((r) => (
        <div className="native-row" key={r.id}>
          <strong>{r.name}</strong>
          <Button secondary disabled={busy} onClick={() => void execute('revoke', { id: r.id })}>
            Klasör iznini kaldır
          </Button>
        </div>
      ))}
      <form
        className="button-row"
        onSubmit={(e) => {
          e.preventDefault();
          void execute('find', { query });
        }}
      >
        <input
          aria-label="Yerel dosya adı"
          placeholder="Dosya adında ara…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={200}
        />
        <Button
          type="submit"
          disabled={busy || query.trim().length < 2 || !capabilities?.roots.length}
        >
          Dosya bul
        </Button>
      </form>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      {results.map((r) => (
        <div className="native-row" key={r.path}>
          <span>
            <strong>{r.name}</strong>
            <small>{r.path}</small>
          </span>
          <Button
            secondary
            disabled={busy}
            onClick={() => void execute('reveal', { path: r.path })}
          >
            Konumunu göster
          </Button>
        </div>
      ))}
      <label className="field">
        Sistem ayar paneli
        <select value={section} onChange={(e) => setSection(e.target.value)}>
          <option value="sound">Ses</option>
          <option value="network">Ağ</option>
          <option value="display">Ekran</option>
        </select>
      </label>
      <Button secondary disabled={busy} onClick={() => void execute('openSettings', { section })}>
        Ayar panelini aç · Değer değiştirmez
      </Button>
      <div className="research-plan">
        <h3>Çok adımlı yerel görev</h3>
        <p>
          En fazla 8 izinli adım. Her uygulama açma ayrı native onay ister. İptal/hata sonraki
          adımları durdurur. Bu plan yalnız bu oturumda yaşar; yeniden başlatmada otomatik tekrar
          çalıştırılmaz.
        </p>
        <label className="field">
          İzinli uygulama
          <select value={appId} onChange={(e) => setAppId(e.target.value)}>
            <option value="">Uygulama seçin</option>
            {capabilities?.applications.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <div className="button-row">
          <Button
            secondary
            disabled={busy || !appId || steps.length >= 8}
            onClick={() =>
              setSteps((old) => [
                ...old,
                {
                  action: 'openApplication',
                  input: { id: appId },
                  label:
                    'Program aç: ' + capabilities?.applications.find((a) => a.id === appId)?.name,
                  status: 'pending',
                },
              ])
            }
          >
            Program adımı ekle
          </Button>
          <Button
            secondary
            disabled={
              busy || query.trim().length < 2 || !capabilities?.roots.length || steps.length >= 8
            }
            onClick={() =>
              setSteps((old) => [
                ...old,
                {
                  action: 'find',
                  input: { query },
                  label: 'Dosya bul: ' + query,
                  status: 'pending',
                },
              ])
            }
          >
            Arama adımı ekle
          </Button>
        </div>
        {steps.map((step, index) => (
          <p key={index}>
            {index + 1}. {step.label} · {step.status}
          </p>
        ))}
        <div className="button-row">
          <Button
            disabled={busy || !steps.length}
            onClick={async () => {
              setBusy(true);
              try {
                for (let i = 0; i < steps.length; i++) {
                  if (steps[i].status === 'done') continue;
                  setSteps((old) =>
                    old.map((s, index) => (index === i ? { ...s, status: 'running' } : s)),
                  );
                  try {
                    const d = await window.prometheusDesktop!.execute(
                      steps[i].action,
                      steps[i].input,
                    );
                    setSteps((old) =>
                      old.map((s, index) =>
                        index === i ? { ...s, status: d.cancelled ? 'cancelled' : 'done' } : s,
                      ),
                    );
                    if (d.cancelled) break;
                    if (d.results) setResults(d.results);
                  } catch (e) {
                    setSteps((old) =>
                      old.map((s, index) => (index === i ? { ...s, status: 'error' } : s)),
                    );
                    throw e;
                  }
                }
                setCapabilities(await window.prometheusDesktop!.capabilities());
                setMessage('Yerel planın güncel aşamaları yukarıda gösteriliyor.');
              } catch (e) {
                setMessage((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Planı çalıştır / Devam et
          </Button>
          <Button secondary disabled={busy} onClick={() => setSteps([])}>
            Planı temizle
          </Button>
        </div>
      </div>
      <details>
        <summary>İşlem günlüğü ({capabilities?.audit.length || 0})</summary>
        {capabilities?.audit.slice(0, 30).map((e) => (
          <p className="audit-line" key={e.id}>
            {new Date(e.date).toLocaleString('tr-TR')} · {e.tool} · {e.status}
          </p>
        ))}
      </details>
    </section>
  );
}
