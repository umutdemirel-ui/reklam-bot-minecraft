import { ListTodo, Info, CheckCircle2 } from 'lucide-react';
import { Flame } from '../components/ui';
export default function AboutPage() {
  return (
    <>
      <section className="about-hero panel">
        <Flame />
        <span className="eyebrow">KİŞİSEL YAPAY ZEKÂ ASİSTANINIZ</span>
        <h2>
          prometheus<span>.</span>
        </h2>
        <p>Merakınızla başlar. Sizinle gelişir.</p>
        <span className="small-tag">v0.1.0 · Geliştirici önizlemesi</span>
      </section>
      <div className="two-column">
        <section className="panel">
          <div className="panel-title">
            <CheckCircle2 size={19} />
            <h2>Bu sürümde</h2>
          </div>
          <ul className="feature-list">
            <li>Duyarlı masaüstü, tablet ve telefon arayüzü</li>
            <li>Kalıcı tema, renk ve ses tercihleri</li>
            <li>Gerçek model bağlantısı ve yazılı komutlar</li>
            <li>Destekli tarayıcılarda Türkçe ses tanıma</li>
            <li>SearXNG ile kaynaklı araştırma özetleri</li>
            <li>Yerel geçmiş ve Markdown / JSON dışa aktarma</li>
          </ul>
        </section>
        <section className="panel">
          <div className="panel-title">
            <ListTodo size={19} />
            <h2>Sırada ne var?</h2>
          </div>
          <ul className="feature-list muted">
            <li>İzinli Windows, macOS ve Linux bağdaştırıcıları</li>
            <li>Yerel STT / TTS ve mikrofon cihaz seçimi</li>
            <li>Tam sayfa araştırma ve çapraz doğrulama</li>
            <li>Yerel mobil istemci ve güvenli eşleştirme</li>
            <li>İsteğe bağlı cihazlar arası senkronizasyon</li>
            <li>Riskli işlemler için onay ve eylem günlüğü</li>
          </ul>
        </section>
      </div>
      <div className="notice">
        <Info size={18} /> Bu sürüm bir web istemcisidir. Windows, macOS, Linux, Android ve iOS için
        yerel uygulama paketleri henüz oluşturulmadı veya test edilmedi. Model çıktıları hatalı
        olabilir; önemli bilgileri doğrulayın.
      </div>
    </>
  );
}
