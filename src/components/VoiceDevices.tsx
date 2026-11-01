import { useState } from 'react';
import { Button } from './ui';
import type { Preferences, PreferenceUpdate } from '../lib/types';
export default function VoiceDevices({
  prefs,
  preference,
}: {
  prefs: Preferences;
  preference: PreferenceUpdate;
}) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [message, setMessage] = useState('');
  return (
    <section className="panel">
      <div className="panel-title">
        <h2>Yerel ses motorları ve mikrofon</h2>
      </div>
      <p className="panel-description">
        Yerel mod ses kaydını yalnızca yapılandırdığınız Prometheus sunucusuna gönderir. Sunucu
        uzaktaysa bu, cihaz içi işleme değildir. Whisper modelini ve Piper ses modelini ayrıca
        kurun. Ham ses geçici dosyadan işlem sonunda silinir; sürekli dinleme yoktur.
      </p>
      <div className="two-column">
        <label className="field">
          Konuşma tanıma
          <select
            value={prefs.sttMode}
            onChange={(e) => preference('sttMode', e.target.value as Preferences['sttMode'])}
          >
            <option value="browser">Tarayıcı servisi</option>
            <option value="local">Yerel Whisper · Sunucu</option>
          </select>
        </label>
        <label className="field">
          Seslendirme
          <select
            value={prefs.ttsMode}
            onChange={(e) => preference('ttsMode', e.target.value as Preferences['ttsMode'])}
          >
            <option value="browser">Cihaz / tarayıcı sesi</option>
            <option value="local">Yerel Piper · Sunucu</option>
          </select>
        </label>
      </div>
      <Button
        secondary
        onClick={async () => {
          let stream: MediaStream | null = null;
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setDevices(
              (await navigator.mediaDevices.enumerateDevices()).filter(
                (d) => d.kind === 'audioinput',
              ),
            );
            setMessage('Cihazlar listelendi. İzin testi kaydı saklanmadı; mikrofon kapatıldı.');
          } catch {
            setMessage('Mikrofon izni veya cihaz listesi alınamadı.');
          } finally {
            stream?.getTracks().forEach((t) => t.stop());
          }
        }}
      >
        Mikrofon izni iste ve cihazları listele
      </Button>
      <label className="field">
        Kayıt mikrofonu
        <select
          disabled={prefs.sttMode !== 'local'}
          value={prefs.microphoneId}
          onChange={(e) => preference('microphoneId', e.target.value)}
        >
          <option value="">Sistem varsayılanı</option>
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || 'Mikrofon'}
            </option>
          ))}
        </select>
        <small>
          Cihaz seçimi yalnız yerel kayıt modunda geçerlidir. Tarayıcı STT servisi kendi
          varsayılanını kullanır.
        </small>
      </label>
      {message && <div className="notice">{message}</div>}
    </section>
  );
}
