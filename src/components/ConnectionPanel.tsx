import { useEffect, useState } from 'react';
import { Button } from './ui';
import { api } from '../lib/client';
export default function ConnectionPanel({ onSaved }: { onSaved: () => void }) {
  const [config, setConfig] = useState({
    provider: 'ollama',
    model: '',
    base: 'http://127.0.0.1:11434',
    search: '',
    hasKey: false,
  });
  const [key, setKey] = useState('');
  const [clearKey, setClearKey] = useState(false);
  const [message, setMessage] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api('/api/config')
      .then((d) => {
        setConfig(d);
        setEnabled(true);
      })
      .catch((e) => setMessage(e.message));
  }, []);
  return (
    <section className="panel">
      <div className="panel-title">
        <h2>Sağlayıcıyı uygulamadan yönet</h2>
        <span className="small-tag">Sahip oturumu gerekli</span>
      </div>
      <p className="panel-description">
        Ayarlar sunucuda saklanır; anahtar yalnız yazılır, geri okunmaz. Kaydetmek tüm bağlı
        cihazların sağlayıcısını değiştirir. Uzak API için HTTPS kullanın.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage('');
          try {
            const saved = await api('/api/config', { ...config, key, clearKey });
            setConfig(saved);
            setKey('');
            setClearKey(false);
            setMessage('Şifreli yapılandırma kaydedildi. Bağlantıyı test edin.');
            onSaved();
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={!enabled || busy} className="plain-fieldset">
          <div className="two-column">
            <label className="field">
              Sağlayıcı
              <select
                value={config.provider}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    provider: e.target.value,
                    base:
                      e.target.value === 'ollama'
                        ? 'http://127.0.0.1:11434'
                        : 'https://api.openai.com/v1',
                  })
                }
              >
                <option value="ollama">Ollama · Yerel</option>
                <option value="openai">OpenAI uyumlu</option>
              </select>
            </label>
            <label className="field">
              Sunucu varsayılan modeli
              <input
                required
                value={config.model}
                maxLength={100}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
              />
            </label>
          </div>
          <label className="field">
            Model servisi adresi
            <input
              required
              type="url"
              value={config.base}
              onChange={(e) => setConfig({ ...config, base: e.target.value })}
            />
          </label>
          <label className="field">
            SearXNG adresi (isteğe bağlı)
            <input
              type="url"
              value={config.search}
              onChange={(e) => setConfig({ ...config, search: e.target.value })}
            />
          </label>
          <label className="field">
            API anahtarı {config.hasKey ? '(kayıtlı · gizli)' : '(tanımlı değil)'}
            <input
              type="password"
              autoComplete="new-password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Değiştirmemek için boş bırakın"
              maxLength={4096}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={clearKey}
              onChange={(e) => setClearKey(e.target.checked)}
            />{' '}
            Kayıtlı anahtarı sil
          </label>
          <Button type="submit">Bağlantı ayarlarını kaydet</Button>
        </fieldset>
      </form>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
    </section>
  );
}
