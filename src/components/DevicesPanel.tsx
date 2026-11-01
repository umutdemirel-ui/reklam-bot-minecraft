import { useState } from 'react';
import { api } from '../lib/client';
import { Button } from './ui';
export default function DevicesPanel() {
  const [devices, setDevices] = useState<
    { id: string; name: string; createdAt: string; current: boolean }[]
  >([]);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  async function load() {
    try {
      setDevices(await api('/api/devices'));
      setMessage('Oturumlar 12 saat geçerlidir. Sunucu yeniden başlarsa tüm oturumlar kapanır.');
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <section className="panel">
      <h2>Bağlı oturumlar</h2>
      <p className="panel-description">
        Aynı sahip parolasıyla bağlanan web ve native istemciler. Cihaz başına oturumu iptal
        edebilirsiniz. Bu, birden çok kullanıcı hesabı veya uzaktan masaüstü kontrolü değildir.
      </p>
      <Button secondary onClick={() => void load()}>
        Cihaz oturumlarını göster
      </Button>
      {devices.map((d) => (
        <div className="native-row" key={d.id}>
          <span>
            {d.name}
            {d.current ? ' · Bu oturum' : ''}
            <small>{new Date(d.createdAt).toLocaleString('tr-TR')}</small>
          </span>
          <Button secondary onClick={() => setPending(d.id)}>
            Oturumu iptal et
          </Button>
        </div>
      ))}
      {pending && (
        <div className="notice warning">
          <span>
            Seçilen cihaz tekrar parola girene kadar erişemeyecek.
            <div className="button-row">
              <Button
                onClick={async () => {
                  try {
                    await api(`/api/devices/${pending}/revoke`, {});
                    setPending(null);
                    await load();
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                }}
              >
                Onayla
              </Button>
              <Button secondary onClick={() => setPending(null)}>
                Vazgeç
              </Button>
            </div>
          </span>
        </div>
      )}
      {message && <p className="notice">{message}</p>}
    </section>
  );
}
