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
            sorulur; aynı düğmeyle durdurulur. Ses kaydı depolanmaz, yalnızca gönderilen komut metni
            geçmişe yazılır.
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
              <span>Tercihler, son 100 komut ve son 20 araştırma bu tarayıcıda saklanır.</span>
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
                Araştırma konusu arama sağlayıcısıyla paylaşılır. Arama özetleri modele gönderilir.
              </span>
            </li>
            <li>
              <Check size={16} />
              <span>API anahtarları tarayıcıda veya kaynak kodunda tutulmaz.</span>
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
          <span className="small-tag">Erişim yok</span>
        </div>
        <p className="panel-description">
          Bu sürümde dosya silme, program açma, şifre okuma veya sistem ayarı değiştirme araçları
          yoktur. Gelecekteki yerel istemcide izin listeleri, riskli eylem onayları ve eylem günlüğü
          ayrı bir güvenlik katmanı olarak uygulanmalıdır. Henüz uygulanmış değildir.
        </p>
      </section>
    </>
  );
}
