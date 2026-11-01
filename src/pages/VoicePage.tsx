import type { ReactNode } from 'react';
import {
  Mic,
  Info,
  AudioLines,
  Volume2,
  SlidersHorizontal,
  CheckCircle2,
  CircleAlert,
} from 'lucide-react';
import { Button, Toggle } from '../components/ui';

import { speak, type SpeechControls } from '../lib/speech';
import type { Preferences, PreferenceUpdate } from '../lib/types';

type Props = {
  prefs: Preferences;
  speech: SpeechControls;
  preference: PreferenceUpdate;
  commandBox: ReactNode;
  resultBox: ReactNode;
  notify: (text: string, error?: boolean) => void;
};
export default function VoicePage({
  prefs,
  speech,
  preference,
  commandBox,
  resultBox,
  notify,
}: Props) {
  return (
    <>
      <div className="two-column">
        <section className="panel voice-panel">
          <span className="accent-label">
            <AudioLines size={15} /> SESLİ ASİSTAN
          </span>
          <h2>Bir konuşmayla başlayalım.</h2>
          <p>
            Mikrofona dokunun, Türkçe konuşun.
            <br />
            Algılanan metni kontrol edip gönderin.
          </p>
          <div className={`microphone-zone ${speech.listening ? 'listening' : ''}`}>
            <div className="mic-orbit orbit-inner" />
            <div className="mic-orbit orbit-outer" />
            <button
              className="microphone-button"
              onClick={speech.toggle}
              aria-label={speech.listening ? 'Dinlemeyi durdur' : 'Dinlemeye başla'}
            >
              <Mic size={33} />
            </button>
          </div>
          <span className="listening-label">
            {speech.listening ? 'Sizi dinliyorum…' : 'Mikrofon kapalı'}
          </span>
          {speech.transcript && <p className="live-transcript">“{speech.transcript}”</p>}
          <span className={`capability ${speech.supported ? 'available' : 'unavailable'}`}>
            {speech.supported ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}
            {speech.supported
              ? 'Tarayıcı ses tanımayı destekliyor'
              : 'Bu tarayıcıda ses tanıma yok'}
          </span>
        </section>
        <section className="panel">
          <div className="panel-title">
            <SlidersHorizontal size={18} />
            <h2>Ses tercihleri</h2>
          </div>
          <Toggle
            label="Yanıtları sesli oku"
            description="Model yanıtlarını cihazın ses motoruyla dinleyin."
            checked={prefs.speak}
            onChange={(v) => preference('speak', v)}
          />
          <label className="field">
            Konuşma dili
            <select value={prefs.language} onChange={(e) => preference('language', e.target.value)}>
              <option value="tr-TR">Türkçe</option>
              <option value="en-US">English</option>
            </select>
          </label>
          <label className="field">
            Konuşma hızı <span>{prefs.speechRate}×</span>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={prefs.speechRate}
              onChange={(e) => preference('speechRate', Number(e.target.value))}
            />
          </label>
          <Button
            secondary
            onClick={() => {
              if (
                !speak(
                  'Merhaba, ben Prometheus. Birlikte daha fazlası mümkün.',
                  prefs.language,
                  prefs.speechRate,
                )
              )
                notify('Ses sentezi desteklenmiyor.', true);
            }}
          >
            <Volume2 size={15} /> Sesi dene
          </Button>
          <div className="notice">
            <Info size={17} />
            <span>
              Ses tanıma tarayıcı sağlayıcısına ses gönderebilir. Sürekli dinleme kapalıdır. Web
              Speech API cihaz seçimini desteklemez; varsayılan mikrofonu tarayıcı veya sistem
              ayarlarından seçin.
            </span>
          </div>
        </section>
      </div>
      <div className="voice-command-wrapper">
        {commandBox}
        {resultBox}
      </div>
    </>
  );
}
