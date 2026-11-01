import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { File, Paths } from 'expo-file-system';
import { fetch as nativeFetch } from 'expo/fetch';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as Speech from 'expo-speech';

type Session = { base: string; token: string };
type Prefs = { theme: 'dark' | 'light'; accent: string; speak: boolean; rememberContext: boolean };
type Entry = {
  id: string;
  text: string;
  response: string;
  date: string;
  type: string;
  status: string;
};
type Job = {
  id: string;
  topic: string;
  status: string;
  report: string;
  step: number;
  error?: string;
  sources: { title: string; url: string; mode?: string }[];
  plan?: { goal: string; queries: string[] };
};
const defaults: Prefs = { theme: 'dark', accent: '#ff3b4f', speak: false, rememberContext: false };
function preferences(raw: unknown): Prefs {
  const p = raw as Partial<Prefs> | null;
  return {
    theme: p?.theme === 'light' ? 'light' : 'dark',
    accent:
      typeof p?.accent === 'string' && /^#[0-9a-f]{6}$/i.test(p.accent)
        ? p.accent
        : defaults.accent,
    speak: p?.speak === true,
    rememberContext: p?.rememberContext === true,
  };
}
function entries(raw: unknown): Entry[] {
  return Array.isArray(raw)
    ? raw
        .filter(
          (e) =>
            e &&
            typeof e.id === 'string' &&
            typeof e.text === 'string' &&
            typeof e.response === 'string',
        )
        .slice(0, 100)
    : [];
}
function load(name: string, fallback: unknown) {
  try {
    const f = new File(Paths.document, name);
    return f.exists ? JSON.parse(f.textSync()) : fallback;
  } catch {
    return fallback;
  }
}
export default function App() {
  return (
    <SafeAreaProvider>
      <Workspace />
    </SafeAreaProvider>
  );
}
function Workspace() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false);
  const [base, setBase] = useState(''),
    [password, setPassword] = useState('');
  const [tab, setTab] = useState<'Asistan' | 'Araştırma' | 'Görevler' | 'Ayarlar'>('Asistan');
  const [prefs, setPrefs] = useState(() => preferences(load('preferences.json', defaults)));
  const [history, setHistory] = useState(() => entries(load('commands.json', [])));
  const [text, setText] = useState(''),
    [topic, setTopic] = useState(''),
    [message, setMessage] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]),
    [selectedId, setSelectedId] = useState('');
  const [revision, setRevision] = useState<number | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recording = useAudioRecorderState(recorder);
  const acting = useRef(false),
    activeRequest = useRef<AbortController | null>(null);
  const s = useMemo(() => styles(prefs), [prefs]);
  const selected = jobs.find((j) => j.id === selectedId);
  useEffect(() => {
    SecureStore.getItemAsync('prometheus.session')
      .then((raw) => {
        if (raw) {
          const d = JSON.parse(raw);
          if (
            typeof d.base === 'string' &&
            typeof d.token === 'string' &&
            new URL(d.base).protocol === 'https:'
          )
            setSession(d);
        }
      })
      .catch(() => setMessage('Güvenli oturum deposu okunamadı.'))
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    try {
      new File(Paths.document, 'preferences.json').write(JSON.stringify(prefs));
      new File(Paths.document, 'commands.json').write(JSON.stringify(history));
    } catch {
      setMessage('Cihaz depolamasına yazılamadı.');
    }
  }, [prefs, history]);
  useEffect(
    () => () => {
      activeRequest.current?.abort();
      void Speech.stop();
    },
    [],
  );
  useEffect(() => {
    if (!session && recorder.isRecording)
      void recorder
        .stop()
        .then(() => {
          if (recorder.uri) new File(recorder.uri).delete();
        })
        .catch(() => {});
  }, [session, recording.isRecording]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && recorder.isRecording)
        void recorder
          .stop()
          .then(() => {
            if (recorder.uri) new File(recorder.uri).delete();
          })
          .catch(() => {});
    });
    return () => sub.remove();
  }, [recorder]);
  async function call(path: string, body?: object, signal?: AbortSignal) {
    if (!session) throw Error('Sunucuya bağlanın.');
    const r = await nativeFetch(session.base + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${session.token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal,
    });
    const d = await r.json();
    if (r.status === 401) {
      await SecureStore.deleteItemAsync('prometheus.session');
      setSession(null);
      throw Error('Oturum sona erdi. Tekrar bağlanın.');
    }
    if (!r.ok) throw Error(d.error || 'İstek tamamlanamadı.');
    return d;
  }
  useEffect(() => {
    if (!session) return;
    let disposed = false,
      pending = false;
    async function refresh() {
      if (pending || AppState.currentState !== 'active') return;
      pending = true;
      try {
        const data = await call('/api/jobs');
        if (!disposed && Array.isArray(data)) setJobs(data);
      } catch (e) {
        if (!disposed) setMessage((e as Error).message);
      } finally {
        pending = false;
      }
    }
    void refresh();
    const timer = setInterval(refresh, 3000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [session]);
  async function run(work: () => Promise<void>) {
    if (acting.current) return;
    acting.current = true;
    setBusy(true);
    setMessage('');
    try {
      await work();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      acting.current = false;
      setBusy(false);
    }
  }
  function confirm(title: string, detail: string, work: () => Promise<void>) {
    Alert.alert(title, detail, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Onayla', onPress: () => void run(work) },
    ]);
  }
  async function login() {
    await run(async () => {
      const u = new URL(base.trim());
      if (
        u.protocol !== 'https:' ||
        u.username ||
        u.password ||
        u.search ||
        u.hash ||
        u.pathname !== '/'
      )
        throw Error('Geçerli bir HTTPS sunucu ana adresi girin.');
      const r = await nativeFetch(u.origin + '/api/session/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          native: true,
          deviceName: `${Platform.OS} · Prometheus mobil`,
        }),
      });
      const d = await r.json();
      if (!r.ok || typeof d.token !== 'string') throw Error(d.error || 'Bağlantı kurulamadı.');
      const next = { base: u.origin, token: d.token };
      await SecureStore.setItemAsync('prometheus.session', JSON.stringify(next), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      setPassword('');
      setSession(next);
    });
  }
  async function send() {
    if (!text.trim()) return;
    await run(async () => {
      const controller = new AbortController();
      activeRequest.current = controller;
      try {
        const d = await call(
          '/api/chat',
          {
            text: text.trim(),
            context: prefs.rememberContext
              ? history
                  .slice(0, 6)
                  .reverse()
                  .flatMap((h) => [
                    { role: 'user', content: h.text.slice(0, 4000) },
                    { role: 'assistant', content: h.response.slice(0, 4000) },
                  ])
              : [],
          },
          controller.signal,
        );
        setHistory((old) =>
          [
            {
              id: String(Date.now()),
              text: text.trim(),
              response: d.text,
              date: new Date().toISOString(),
              type: 'chat',
              status: 'done',
            },
            ...old,
          ].slice(0, 100),
        );
        setText('');
        if (prefs.speak) Speech.speak(d.text, { language: 'tr-TR' });
      } finally {
        activeRequest.current = null;
      }
    });
  }
  async function voice() {
    await run(async () => {
      if (!recorder.isRecording) {
        if (!(await requestRecordingPermissionsAsync()).granted)
          throw Error('Mikrofon izni verilmedi.');
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        return;
      }
      await recorder.stop();
      if (!recorder.uri) throw Error('Kayıt alınamadı.');
      const file = new File(recorder.uri);
      try {
        if (file.size > 10 * 1024 * 1024) throw Error('Ses kaydı çok büyük.');
        const r = await nativeFetch(session!.base + '/api/voice/transcribe?language=tr-TR', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session!.token}`,
            'Content-Type': 'application/octet-stream',
          },
          body: file,
        });
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        setText(d.text);
        setMessage('Transkripti kontrol edip gönderin.');
      } finally {
        file.delete();
        await setAudioModeAsync({ allowsRecording: false });
      }
    });
  }
  useEffect(() => {
    if (recording.isRecording && recording.durationMillis >= 60000) void voice();
  }, [recording.durationMillis]);
  const button = (title: string, action: () => void, secondary = false, disabled = busy) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={action}
      style={[s.button, secondary && s.secondary, disabled && { opacity: 0.4 }]}
    >
      <Text style={[s.buttonText, secondary && s.secondaryText]}>{title}</Text>
    </Pressable>
  );
  if (!ready)
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={prefs.accent} />
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.header}>
          <Text style={s.brand}>
            ♨ prometheus<Text style={{ color: prefs.accent }}>.</Text>
          </Text>
          <Text style={s.caption}>{Platform.OS} · Yerel istemci</Text>
        </View>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {!session ? (
            <View style={s.panel}>
              <Text style={s.title}>Kendi asistanınıza bağlanın.</Text>
              <Text style={s.p}>
                PROMETHEUS_PASSWORD tanımlı sunucunuzun HTTPS adresini kullanın. Telefonda localhost
                bilgisayarınız değildir. Oturum Keychain/Keystore'da saklanır; API anahtarı mobil
                istemciye verilmez.
              </Text>
              <TextInput
                style={s.input}
                accessibilityLabel="Sunucu adresi"
                placeholder="https://asistan.example.com"
                placeholderTextColor="#888"
                value={base}
                onChangeText={setBase}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TextInput
                style={s.input}
                accessibilityLabel="Sunucu parolası"
                placeholder="Sunucu parolası"
                placeholderTextColor="#888"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                maxLength={1024}
              />
              {button('Bağlan', () => void login())}
            </View>
          ) : (
            <>
              {tab === 'Asistan' && (
                <>
                  <View style={s.panel}>
                    <Text style={s.kicker}>DÜŞÜN. SÖYLE. HAREKETE GEÇ.</Text>
                    <Text style={s.title}>Merhaba, ben Prometheus.</Text>
                    <Text style={s.p}>
                      Ses kaydı native API ile alınır, seçtiğiniz sunucunun Whisper motoruna
                      gönderilir. Bu istemci masaüstü programlarını kontrol etmez.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        recording.isRecording ? 'Kaydı bitir' : 'Ses kaydı başlat'
                      }
                      disabled={busy}
                      onPress={() => void voice()}
                      style={s.mic}
                    >
                      <Text style={s.micText}>{recording.isRecording ? '■' : '●'}</Text>
                    </Pressable>
                    <Text style={s.caption}>
                      {recording.isRecording
                        ? `Kaydediliyor · ${Math.floor(recording.durationMillis / 1000)} sn`
                        : 'Mikrofon kapalı · En fazla 60 sn'}
                    </Text>
                    <TextInput
                      accessibilityLabel="Komut"
                      style={[s.input, { minHeight: 90 }]}
                      placeholder="Bir şey sorun…"
                      placeholderTextColor="#888"
                      multiline
                      maxLength={4000}
                      value={text}
                      onChangeText={setText}
                    />
                    {button(
                      'Gönder',
                      () => void send(),
                      false,
                      busy || recording.isRecording || !text.trim(),
                    )}
                    {busy &&
                      activeRequest.current &&
                      button('Yanıtı durdur', () => activeRequest.current?.abort(), true, false)}
                  </View>
                  <Text style={s.section}>Konuşma geçmişi</Text>
                  {button(
                    'Cihaz geçmişini sil',
                    () =>
                      confirm(
                        'Geçmiş silinsin mi?',
                        'Yerel konuşmalar silinir. Sunucu eşitleme kopyası etkilenmez.',
                        async () => setHistory([]),
                      ),
                    true,
                  )}
                  {history.map((h) => (
                    <View style={s.panel} key={h.id}>
                      <Text style={s.section}>{h.text}</Text>
                      <Text style={s.p} selectable>
                        {h.response}
                      </Text>
                      {button(
                        'Sesli oku',
                        () => Speech.speak(h.response, { language: 'tr-TR' }),
                        true,
                      )}
                    </View>
                  ))}
                </>
              )}
              {tab === 'Araştırma' && (
                <>
                  <View style={s.panel}>
                    <Text style={s.title}>Bir sorunun derinine inin.</Text>
                    <Text style={s.p}>
                      SearXNG ve model bağlantısı gerektirir. Araştırma sunucudaki kalıcı kuyrukta
                      sürer.
                    </Text>
                    <TextInput
                      style={[s.input, { minHeight: 90 }]}
                      accessibilityLabel="Araştırma konusu"
                      placeholder="Araştırma konusu…"
                      placeholderTextColor="#888"
                      multiline
                      maxLength={1000}
                      value={topic}
                      onChangeText={setTopic}
                    />
                    {button(
                      'Araştırmayı başlat',
                      () =>
                        void run(async () => {
                          const d = await call('/api/jobs', { topic });
                          setJobs(await call('/api/jobs'));
                          setSelectedId(d.id);
                        }),
                      false,
                      busy || topic.trim().length < 3,
                    )}
                  </View>
                  {selected && (
                    <View style={s.panel}>
                      <Text style={s.section}>{selected.topic}</Text>
                      <Text style={s.caption}>
                        {selected.status} · Aşama {selected.step + 1}/4
                      </Text>
                      {selected.plan && (
                        <Text style={s.p}>
                          {selected.plan.goal}
                          {'\n'}
                          {selected.plan.queries.join('\n')}
                        </Text>
                      )}
                      {selected.error && <Text style={s.error}>{selected.error}</Text>}
                      {selected.report ? (
                        <Text style={s.p} selectable>
                          {selected.report}
                        </Text>
                      ) : null}
                      {selected.sources.map((source, i) => (
                        <Text key={i} style={s.p} selectable>
                          [{i + 1}] {source.title} ·{' '}
                          {source.mode === 'full' ? 'Tam sayfa' : 'Arama özeti'}
                          {'\n'}
                          {source.url}
                        </Text>
                      ))}
                      {['running', 'queued'].includes(selected.status) &&
                        button(
                          'Araştırmayı durdur',
                          () =>
                            void run(async () => {
                              await call(`/api/jobs/${selected.id}/cancel`, {});
                              setJobs(await call('/api/jobs'));
                            }),
                          true,
                        )}
                      <Text style={s.caption}>
                        Alıntı eşleşmesi bağımsız olgusal doğruluk garantisi değildir.
                      </Text>
                    </View>
                  )}
                </>
              )}
              {tab === 'Görevler' && (
                <>
                  <Text style={s.title}>Kalıcı görevler</Text>
                  <Text style={s.p}>
                    Kesilmiş işler konuyu yeniden göndererek tekrar başlatılabilir.
                  </Text>
                  {jobs.map((j) => (
                    <View style={s.panel} key={j.id}>
                      <Text style={s.section}>{j.topic}</Text>
                      <Text style={s.caption}>{j.status}</Text>
                      {button(
                        'Görevi aç',
                        () => {
                          setSelectedId(j.id);
                          setTopic(j.topic);
                          setTab('Araştırma');
                        },
                        true,
                      )}
                      {!['running', 'queued'].includes(j.status) &&
                        button(
                          'Kaydı sil',
                          () =>
                            confirm(
                              'Sunucudan silinsin mi?',
                              'Kayıt bütün bağlı cihazların listesinden kaldırılır.',
                              async () => {
                                await call(`/api/jobs/${j.id}/delete`, {});
                                setJobs(await call('/api/jobs'));
                              },
                            ),
                          true,
                        )}
                    </View>
                  ))}
                  {!jobs.length && <Text style={s.p}>Henüz görev yok.</Text>}
                </>
              )}
              {tab === 'Ayarlar' && (
                <>
                  <View style={s.panel}>
                    <Text style={s.title}>Size özel.</Text>
                    <Text style={s.p} selectable>
                      {session.base}
                    </Text>
                    {button(
                      prefs.theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç',
                      () =>
                        setPrefs({ ...prefs, theme: prefs.theme === 'dark' ? 'light' : 'dark' }),
                      true,
                    )}
                    <View style={s.row}>
                      {['#ff3b4f', '#518ced', '#9773f4', '#39b891'].map((c) => (
                        <Pressable
                          key={c}
                          accessibilityRole="button"
                          accessibilityLabel={'Vurgu ' + c}
                          onPress={() => setPrefs({ ...prefs, accent: c })}
                          style={{
                            backgroundColor: c,
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            borderWidth: prefs.accent === c ? 3 : 0,
                            borderColor: '#ddd',
                          }}
                        />
                      ))}
                    </View>
                    {button(
                      prefs.speak ? 'Sesli yanıtı kapat' : 'Sesli yanıtı aç',
                      () => setPrefs({ ...prefs, speak: !prefs.speak }),
                      true,
                    )}
                    {button(
                      prefs.rememberContext
                        ? 'Sohbet bağlamını kapat'
                        : 'Son 6 sohbeti modele gönder',
                      () => setPrefs({ ...prefs, rememberContext: !prefs.rememberContext }),
                      true,
                    )}
                    <Text style={s.p}>
                      Geçmiş cihazın uygulama dosyalarında tutulur; şifreli kasa değildir. Arka
                      plana geçince ses kaydı iptal edilir. TTS cihazın native ses motorunu
                      kullanır; çevrimdışı destek cihaza bağlıdır.
                    </Text>
                  </View>
                  <View style={s.panel}>
                    <Text style={s.section}>İsteğe bağlı eşitleme</Text>
                    <Text style={s.p}>
                      Geçmiş sunucuda kopyalanır. Uçtan uca şifreleme yoktur; sunucu yöneticisi
                      okuyabilir.
                    </Text>
                    {button(
                      'Sunucu sürümünü kontrol et',
                      () =>
                        void run(async () => {
                          const d = await call('/api/workspace');
                          setRevision(d.revision);
                          setMessage('Sunucu sürümü: ' + d.revision);
                        }),
                      true,
                    )}
                    {button(
                      'Bu cihazdan gönder',
                      () =>
                        confirm(
                          'Geçmiş gönderilsin mi?',
                          'Sunucu kopyası değiştirilecek.',
                          async () => {
                            const d = await call('/api/workspace', {
                              revision,
                              preferences: prefs,
                              history,
                            });
                            setRevision(d.revision);
                            setMessage('Gönderildi.');
                          },
                        ),
                      true,
                      busy || revision === null,
                    )}
                    {button(
                      'Sunucudan al',
                      () =>
                        confirm(
                          'Yerel kayıtlar değişsin mi?',
                          'Sunucudaki tercihler ve geçmiş yerel kopyanın yerini alır.',
                          async () => {
                            const d = await call('/api/workspace');
                            setPrefs(preferences(d.preferences));
                            setHistory(entries(d.history));
                            setRevision(d.revision);
                          },
                        ),
                      true,
                    )}
                    {button(
                      'Sunucu kopyasını sil',
                      () =>
                        confirm(
                          'Sunucu kopyası silinsin mi?',
                          'Yerel veriler korunur.',
                          async () => {
                            await call('/api/workspace/delete', {});
                            setRevision(null);
                            setMessage('Sunucu kopyası silindi.');
                          },
                        ),
                      true,
                    )}
                  </View>
                  {button(
                    'Oturumu kapat',
                    () =>
                      void run(async () => {
                        try {
                          await call('/api/session/logout', {});
                        } finally {
                          await SecureStore.deleteItemAsync('prometheus.session');
                          setSession(null);
                          void Speech.stop();
                        }
                      }),
                    true,
                  )}
                </>
              )}
            </>
          )}
          {busy && <ActivityIndicator color={prefs.accent} />}
          {message ? (
            <Text style={s.feedback} accessibilityLiveRegion="polite">
              {message}
            </Text>
          ) : null}
        </ScrollView>
        {session && (
          <View style={s.nav}>
            {(['Asistan', 'Araştırma', 'Görevler', 'Ayarlar'] as const).map((name) => (
              <Pressable
                key={name}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === name }}
                onPress={() => setTab(name)}
                style={s.navItem}
              >
                <Text
                  style={[s.caption, tab === name && { color: prefs.accent, fontWeight: '700' }]}
                >
                  {name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
function styles(p: Prefs) {
  const dark = p.theme === 'dark',
    text = dark ? '#eeeaf1' : '#28212e',
    bg = dark ? '#0c0c10' : '#f7f6fa',
    panel = dark ? '#15141b' : '#fff',
    line = dark ? '#302d38' : '#ded9e7',
    muted = dark ? '#a19aab' : '#776b82';
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: bg },
    header: {
      padding: 20,
      borderBottomWidth: 1,
      borderColor: line,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 10,
    },
    brand: { fontSize: 22, fontWeight: '700', color: text },
    caption: { color: muted, fontSize: 12, lineHeight: 20 },
    content: {
      padding: 20,
      gap: 16,
      width: '100%',
      maxWidth: 900,
      alignSelf: 'center',
      paddingBottom: 35,
    },
    panel: {
      padding: 22,
      backgroundColor: panel,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: line,
      gap: 16,
    },
    title: { fontSize: 27, fontWeight: '600', lineHeight: 36, letterSpacing: -0.7, color: text },
    p: { fontSize: 14, lineHeight: 24, color: muted },
    kicker: { color: p.accent, fontSize: 10, letterSpacing: 2 },
    input: {
      borderColor: line,
      borderWidth: 1,
      borderRadius: 10,
      padding: 14,
      color: text,
      backgroundColor: bg,
      fontSize: 15,
      minHeight: 48,
    },
    button: {
      backgroundColor: p.accent,
      borderRadius: 9,
      padding: 13,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    secondary: { backgroundColor: bg, borderWidth: 1, borderColor: line },
    secondaryText: { color: text },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    section: { color: text, fontSize: 17, fontWeight: '600', lineHeight: 25 },
    mic: {
      alignSelf: 'center',
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: p.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 10,
      borderWidth: 1,
      borderColor: '#ff9aa4',
    },
    micText: { fontSize: 36, color: '#fff' },
    error: { fontSize: 14, lineHeight: 22, color: dark ? '#ff9da8' : '#a72b42' },
    feedback: {
      fontSize: 14,
      lineHeight: 24,
      padding: 16,
      color: text,
      borderColor: line,
      borderWidth: 1,
      borderRadius: 10,
      backgroundColor: panel,
    },
    nav: { flexDirection: 'row', borderTopWidth: 1, borderColor: line, backgroundColor: panel },
    navItem: { flex: 1, paddingVertical: 17, alignItems: 'center', minHeight: 52 },
  });
}
