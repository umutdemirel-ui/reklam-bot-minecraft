import { useEffect, useState, type ReactNode } from 'react';
import { Flame, Button } from './ui';
import { LockKeyhole } from 'lucide-react';
export default function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'locked' | 'ready' | 'error'>('loading');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch('/api/session')
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d) => setState(d.required && !d.authenticated ? 'locked' : 'ready'))
      .catch(() => setState('error'));
  }, []);
  useEffect(() => {
    const lock = () => setState('locked');
    window.addEventListener('prometheus:locked', lock);
    return () => window.removeEventListener('prometheus:locked', lock);
  }, []);
  if (state === 'ready') return children;
  const insecure =
    location.protocol !== 'https:' &&
    !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  return (
    <div className="auth-screen">
      <section className="panel auth-card">
        <Flame />
        <h1>Prometheus</h1>
        <p>
          {state === 'loading'
            ? 'Güvenli çalışma alanı hazırlanıyor…'
            : state === 'error'
              ? 'Sunucuya ulaşılamadı. Bağlantıyı kontrol edin.'
              : 'Kişisel çalışma alanınızın kilidini açın.'}
        </p>
        {state === 'locked' && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                const r = await fetch('/api/session/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ password }),
                });
                const d = await r.json();
                if (!r.ok) throw Error(d.error);
                setPassword('');
                setState('ready');
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              Sunucu parolası
              <input
                type="password"
                value={password}
                maxLength={1024}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {insecure && (
              <p className="error-text">
                Uzak bağlantıda HTTPS gerekli. Parolanızı şifresiz ağ üzerinden göndermeyin.
              </p>
            )}
            {error && (
              <p role="alert" className="error-text">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy || !password || insecure}>
              <LockKeyhole size={16} /> {busy ? 'Bağlanıyor…' : 'Çalışma alanını aç'}
            </Button>
          </form>
        )}
        {state === 'error' && <Button onClick={() => location.reload()}>Tekrar dene</Button>}
        <small>Parola tarayıcıda saklanmaz. Oturum HttpOnly çerezle korunur.</small>
      </section>
    </div>
  );
}
