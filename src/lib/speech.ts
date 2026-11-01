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
  options: { mode: 'browser' | 'local'; deviceId: string } = { mode: 'browser', deviceId: '' },
) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognition = useRef<Recognition | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const recordingStream = useRef<MediaStream | null>(null);
  const recordingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const upload = useRef<AbortController | null>(null);
  const disposed = useRef(false);
  const recordingStart = useRef(false);
  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
      if (recordingTimer.current) clearTimeout(recordingTimer.current);
      if (recorder.current?.state === 'recording') recorder.current.stop();
      recordingStream.current?.getTracks().forEach((t) => t.stop());
      upload.current?.abort();
    };
  }, []);
  async function recordLocal() {
    if (recorder.current?.state === 'recording') {
      recorder.current.stop();
      return;
    }
    if (upload.current || recordingStart.current) return;
    recordingStart.current = true;
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: options.deviceId ? { deviceId: { exact: options.deviceId } } : true,
      });
      if (disposed.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      recordingStream.current = stream;
      const r = new MediaRecorder(stream);
      recorder.current = r;
      const chunks: Blob[] = [];
      let bytes = 0;
      r.ondataavailable = (event) => {
        bytes += event.data.size;
        if (bytes <= 10 * 1024 * 1024) chunks.push(event.data);
        else if (r.state === 'recording') r.stop();
      };
      r.onstop = async () => {
        stream?.getTracks().forEach((t) => t.stop());
        if (recordingTimer.current) clearTimeout(recordingTimer.current);
        setListening(false);
        if (disposed.current) return;
        const controller = new AbortController();
        upload.current = controller;
        try {
          const response = await fetch(
            '/api/voice/transcribe?language=' + encodeURIComponent(language),
            {
              method: 'POST',
              headers: { 'Content-Type': r.mimeType || 'application/octet-stream' },
              body: new Blob(chunks, { type: r.mimeType }),
              signal: controller.signal,
            },
          );
          const data = await response.json();
          if (!response.ok) throw Error(data.error);
          setTranscript(data.text);
          callbacks.current.onText(data.text);
        } catch (e) {
          if (!controller.signal.aborted) callbacks.current.onError((e as Error).message);
        } finally {
          upload.current = null;
        }
      };
      r.start(500);
      setTranscript('');
      setListening(true);
      recordingTimer.current = setTimeout(() => {
        if (r.state === 'recording') r.stop();
      }, 60000);
    } catch {
      stream?.getTracks().forEach((t) => t.stop());
      callbacks.current.onError(
        'Mikrofon kaydı başlatılamadı. İzni ve seçili cihazı kontrol edin.',
      );
    } finally {
      recordingStart.current = false;
    }
  }
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
    if (options.mode === 'local') {
      void recordLocal();
      return;
    }
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
    supported:
      options.mode === 'local'
        ? Boolean(navigator.mediaDevices && window.MediaRecorder)
        : Boolean(Constructor),
    stop: () => {
      recognition.current?.stop();
      if (recorder.current?.state === 'recording') recorder.current.stop();
    },
  };
}
let localAudio: HTMLAudioElement | null = null;
let localSpeechRequest: AbortController | null = null;
export function stopSpeech() {
  localAudio?.pause();
  localSpeechRequest?.abort();
  window.speechSynthesis?.cancel();
}
export function speak(
  text: string,
  language: string,
  rate: number,
  mode: 'browser' | 'local' = 'browser',
) {
  localAudio?.pause();
  localSpeechRequest?.abort();
  if (mode === 'local') {
    const controller = new AbortController();
    localSpeechRequest = controller;
    void (async () => {
      let url = '';
      try {
        const response = await fetch('/api/voice/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text.slice(0, 4000) }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const data = await response.json();
          throw Error(data.error);
        }
        url = URL.createObjectURL(await response.blob());
        const audio = new Audio(url);
        localAudio = audio;
        audio.playbackRate = rate;
        audio.onended = () => URL.revokeObjectURL(url);
        audio.onerror = () => URL.revokeObjectURL(url);
        await audio.play();
      } catch (e) {
        if (url) URL.revokeObjectURL(url);
        if (!controller.signal.aborted)
          window.dispatchEvent(
            new CustomEvent('prometheus:speech-error', { detail: (e as Error).message }),
          );
      }
    })();
    return true;
  }
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
  return true;
}

export type SpeechControls = ReturnType<typeof useSpeech>;
