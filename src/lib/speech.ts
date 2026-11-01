import { useRef, useState, useEffect } from 'react';
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    ((e: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
export function useSpeech(
  onText: (text: string) => void,
  onError: (error: string) => void,
  language: string,
) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognition = useRef<Recognition | null>(null);
  const callbacks = useRef({ onText, onError });
  callbacks.current = { onText, onError };
  const Constructor =
    (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
  useEffect(
    () => () => {
      if (recognition.current) {
        recognition.current.onend = null;
        recognition.current.onresult = null;
        recognition.current.abort();
      }
    },
    [],
  );
  function toggle() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    if (!Constructor) {
      callbacks.current.onError(
        'Bu tarayıcı konuşma tanımayı desteklemiyor. Chrome veya Edge deneyin; yazılı komut her zaman kullanılabilir.',
      );
      return;
    }
    const r = new Constructor();
    recognition.current = r;
    r.lang = language;
    r.continuous = false;
    r.interimResults = true;
    r.onresult = (e) => {
      let final = '';
      let interim = '';
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      setTranscript(final || interim);
      if (final) callbacks.current.onText(final);
    };
    r.onerror = (e) => {
      setListening(false);
      const errors: Record<string, string> = {
        'not-allowed': 'Mikrofon izni verilmedi. Tarayıcı site ayarlarından izin verebilirsiniz.',
        'no-speech': 'Ses algılanmadı. Tekrar deneyebilirsiniz.',
        'audio-capture': 'Mikrofon bulunamadı. Cihaz bağlantısını kontrol edin.',
        network:
          'Konuşma tanıma servisine bağlanılamadı. Tarayıcınız internet bağlantısı gerektirebilir.',
      };
      callbacks.current.onError(errors[e.error] || `Konuşma tanıma durdu (${e.error}).`);
    };
    r.onend = () => setListening(false);
    try {
      setTranscript('');
      r.start();
      setListening(true);
    } catch {
      callbacks.current.onError('Mikrofon başlatılamadı. Site izinlerini kontrol edin.');
    }
  }
  return {
    listening,
    transcript,
    toggle,
    supported: Boolean(Constructor),
    stop: () => recognition.current?.stop(),
  };
}
export function speak(text: string, language: string, rate: number) {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
  return true;
}

export type SpeechControls = ReturnType<typeof useSpeech>;
