# 0.2.0 teslim ve doğrulama matrisi

## Bu ortamda geçti

- [x] React/TypeScript üretim derlemesi ve tip kontrolü.
- [x] Prettier biçim denetimi.
- [x] 41 birim/gerçek HTTP/güvenlik/araç testi.
- [x] 13 Chromium tarayıcı testi; 10 sayfa, mobil/masaüstü gezinme ve yatay taşma.
- [x] Tema/renk/kart sırası/menü görünürlüğü kalıcılığı ve bozuk yerel veriye geri dönüş.
- [x] Parolalı oturum API'si, HttpOnly cookie, token, cihaz iptali ve sahip yetkisi.
- [x] Anahtar şifreleme, geri okumama, sağlayıcı değişiminde sır taşımama.
- [x] Eşitleme revision çakışması ve açık silme.
- [x] Özel ağ/DNS/IP/protokol/port SSRF testleri.
- [x] Kontrollü sağlayıcılarla çok sorgulu plan, tam sayfa/özet ayrımı ve alıntı eşleştirme.
- [x] Kalıcı kuyruğun FIFO, iptal, yeniden başlatmada kesilme ve aktif kayıt silmeme testleri.
- [x] Gerçek geçici dosya ağacında izinli kök ve symlink dışlama testleri.
- [x] Masaüstü çekirdeğinde izin listesi, onay iptali, ayar paneli izin listesi ve audit testleri.
- [x] Native IPC renderer sözleşmesi, persistent job yenileme/iptal UI testleri (kontrollü köprü/servis yanıtlarıyla).
- [x] Electron main/preload/araç/paketleme kaynak sözdizimi kontrolü.
- [x] Python STT script sözdizimi derlemesi (model çalıştırması değildir).
- [x] Ayrı React Native mobil TypeScript kontrolü.
- [x] Android JavaScript Metro bundle export'u (APK değildir).
- [x] iOS JavaScript Metro bundle export'u (IPA değildir).
- [x] Kök ve mobil npm güvenlik kontrolünde raporlanan açık yok (kontrol anında).

## Dağıtım / cihaz ortamında yapılmalı

- [ ] Canlı Ollama model çıkarımı, Türkçe kalite ve çok turlu bağlam ölçümü.
- [ ] Gerçek SearXNG kurulumu, canlı kaynaklar, bot engelleri ve sentez kalitesi.
- [ ] Gerçek Whisper/Piper modelleri, Türkçe mikrofon/hoparlör, gecikme/RAM/CPU ve model lisansları.
- [ ] Windows, macOS, Linux Electron runtime başlatma. Bu sandbox'ta Electron ikilisi indirilemedi; grafik runtime testi/paketleme tamamlanmadı.
- [ ] Hedef OS'te native dosya seçici, izin iptali, uygulama açma/kapatma, kaydetme uyarısı ve OS güvenli kasası.
- [ ] Windows kod imzası, macOS notarizasyonu, Linux dağıtım paketleri ve gerçek kurulum/kaldırma.
- [ ] Android SDK ile native derleme, APK/AAB ve fiziksel telefon/tablet.
- [ ] macOS/Xcode ile iOS native derleme, IPA, iPhone/iPad ve mağaza izinleri.
- [ ] HTTPS sunucu, token yenileme süreci, cihaz iptali ve mobil ses yüklemesini gerçek ağda deneme.
- [ ] Çok cihazlı eşitleme, gerçek bağlantı kesilmesi, disk dolması, güç kesilmesi ve yedek geri yükleme senaryoları.
- [ ] Bağımsız erişilebilirlik, güvenlik ve performans denetimi.

## Bu sürümde kapsam dışı; “tamamlandı” sayılmaz

- [ ] Doğal dilden sınırsız uygulama içi otomasyon / sistem ayarını doğrudan değiştirme.
- [ ] macOS'ta genel uygulama kapatma ve üçüncü taraf süreç yönetimi.
- [ ] Mobil cihazdan uzaktan masaüstü kontrolü / cihaz eşleştirme ajanı.
- [ ] Çok kullanıcılı hesap izolasyonu.
- [ ] Otomatik ve uçtan uca şifreli senkronizasyon.
- [ ] İddiaların bağımsız olgusal doğrulaması ve kapsamlı kaynak güvenilirliği puanlaması.
- [ ] PDF/JS sayfa tarama ve sınırsız otonom araştırma.
- [ ] Sürekli dinleme veya wake-word.

**Final kapısı:** Yukarıdaki gerekli hedef cihaz/dağıtım testleri geçmeden tüm platformlarda kusursuz, üretime hazır final iddiası yapılmamalıdır. Mevcut teslim, çalışan web sürümü ve test edilmiş çekirdeklerle birlikte native istemci kaynaklarını içeren 0.2.0 platform doğrulama sürümüdür.
