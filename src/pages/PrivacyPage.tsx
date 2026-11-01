import { Mic, ShieldCheck, Info, ArrowRight, Check, Monitor, LockKeyhole } from 'lucide-react';
import { Button } from '../components/ui';
import type { Page } from '../lib/types';

type Props = { listening: boolean; navigate: (page: Page) => void };
export default function PrivacyPage({ listening, navigate }: Props) {
  return (
    <>
      <section className="privacy-hero panel">
        <span className="privacy-hero-icon">
          <ShieldCheck size={33} strokeWidth={1.3} />
        </span>
        <div>
          <span className="accent-label">ÖNCE GÜVEN</span>
          <h2>Kontrol sizde. Her zaman.</h2>
          <p>
            Prometheus arka planda cihazınızı taramaz. Ses, model bağlantıları ve yerel depolama
            için aşağıdaki sınırlar geçerlidir.
          </p>
        </div>
      </section>
      <div className="two-column">
        <section className="panel">
          <div className="panel-title">
            <Mic size={18} />
            <h2>Mikrofon ve ses</h2>
          </div>
          <div className="permission-status">
            <span className="status-dot" />
            {listening ? 'Mikrofon şu anda açık' : 'Mikrofon şu anda kapalı'}
          </div>
          <p className="panel-description">
            Dinleme yalnızca mikrofon düğmesine dokunduğunuzda başlar. İzin tarayıcı tarafından
            sorulur; aynı düğmeyle durdurulur. Tarayıcı STT modunda kayıt tutulmaz. Yerel Whisper
            modunda kayıt sunucuya geçici dosya olarak yazılır, işlem sonunda silinir. Gönderilen
            metin geçmişe yazılır.
          </p>
          <div className="notice warning">
            <Info size={17} /> Tarayıcı ses tanıma hizmeti bulut tabanlı olabilir. Çevrimdışı veya
            tamamen yerel çalıştığı garanti edilmez. İzni tarayıcı site ayarlarından
            kaldırabilirsiniz.
          </div>
          <Button secondary onClick={() => navigate('voice')}>
            Ses ayarlarına git <ArrowRight size={14} />
          </Button>
        </section>
        <section className="panel">
          <div className="panel-title">
            <LockKeyhole size={18} />
            <h2>Veriler ve bağlantılar</h2>
          </div>
          <ul className="privacy-list">
            <li>
              <Check size={16} />
              <span>
                Tercihler ve son 100 komut bu tarayıcıda; en fazla 50 araştırma sunucuda saklanır.
                Eşitleme seçilirse geçmişin bir kopyası sunucuda tutulur.
              </span>
            </li>
            <li>
              <Check size={16} />
              <span>
                Model istekleri yalnızca yapılandırılan sağlayıcıya sunucu üzerinden gönderilir.
              </span>
            </li>
            <li>
              <Check size={16} />
              <span>
                Araştırma konusu arama sağlayıcısıyla paylaşılır. Arama özetleri ve okunabilen tam
                sayfa metinleri modele gönderilir.
              </span>
            </li>
            <li>
              <Check size={16} />
              <span>
                API anahtarları sunucuda AES-GCM ile saklanabilir; Electron güvenli OS kasası
                uygunsa anahtarını orada korur. Tarayıcıya geri okunmaz.
              </span>
            </li>
          </ul>
          <Button secondary onClick={() => navigate('history')}>
            Verilerimi görüntüle <ArrowRight size={14} />
          </Button>
        </section>
      </div>
      <section className="panel">
        <div className="panel-title">
          <Monitor size={19} />
          <h2>Cihaz yetkileri</h2>
          <span className="small-tag">
            {window.prometheusDesktop ? 'Seçili izinler · Native onay' : 'Web cihaz yetkisi yok'}
          </span>
        </div>
        <p className="panel-description">
          Web/mobil istemciler bilgisayarınızdaki uygulamaları kontrol edemez. Electron istemcisinde
          yalnız seçili uygulama açma, bu oturumun sahip olduğu süreçleri kapatma, izinli
          klasörlerde arama ve ayar paneli açma araçları vardır. Silme, şifre okuma veya doğrudan
          sistem ayarı değiştirme aracı yoktur. Açma/kapatma/konum gösterme ve ayar paneli için
          native onay alınır; içerik içermeyen işlem günlüğü tutulur.
        </p>
      </section>
    </>
  );
}
