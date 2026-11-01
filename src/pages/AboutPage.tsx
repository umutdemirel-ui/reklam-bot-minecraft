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
        <span className="small-tag">v0.2.0 · Platform doğrulama sürümü</span>
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
            <li>Kalıcı kuyruk, çoklu arama, tam sayfa okuma</li>
            <li>Alıntı eşleştirme, plan ve kaynaklı rapor</li>
            <li>Electron izinli araçları ve native mobil istemci</li>
            <li>Parolalı oturum, cihaz iptali ve isteğe bağlı aktarım</li>
            <li>Yerel geçmiş ve Markdown / JSON dışa aktarma</li>
          </ul>
        </section>
        <section className="panel">
          <div className="panel-title">
            <ListTodo size={19} />
            <h2>Sırada ne var?</h2>
          </div>
          <ul className="feature-list muted">
            <li>Windows / macOS / Linux gerçek cihaz doğrulaması</li>
            <li>Türkçe Whisper / Piper kalite ve donanım testleri</li>
            <li>Bağımsız iddia doğrulama ve kaynak güvenilirliği</li>
            <li>Android / iOS derleme, imzalama ve cihaz testi</li>
            <li>Uçtan uca şifreli, otomatik senkronizasyon</li>
            <li>Uygulama içi kapsamlı otomasyon ve sistem ayarı değişiklikleri</li>
          </ul>
        </section>
      </div>
      <div className="notice">
        <Info size={18} /> Bu görünüm web veya Electron istemcisinde kullanılabilir. React Native
        mobil istemci ayrı projededir. Yerel kurulum paketleri ve gerçek cihaz testleri
        tamamlanmadan tüm platformlar için final onayı verilemez. Model çıktıları hatalı olabilir;
        önemli bilgileri doğrulayın.
      </div>
    </>
  );
}
