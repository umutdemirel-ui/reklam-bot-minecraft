import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
export function runProcess(executable, args, { signal, input, maxBytes = 100000 } = {}) {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      shell: false,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let output = '',
      total = 0;
    const timeout = setTimeout(() => child.kill('SIGKILL'), 120000);
    const abort = () => child.kill('SIGKILL');
    signal?.addEventListener('abort', abort, { once: true });
    child.stdout.on('data', (data) => {
      total += data.length;
      if (total > maxBytes) child.kill('SIGKILL');
      else output += data.toString('utf8');
    });
    child.stderr.resume();
    child.stdin.on('error', () => {});
    child.stdin.end(input);
    child.once('error', () => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      reject(new Error('Yerel ses motoru başlatılamadı. Kurulumu kontrol edin.'));
    });
    child.once('close', (code) => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      if (code || signal?.aborted)
        reject(new Error('Yerel ses işlemi tamamlanamadı veya durduruldu.'));
      else resolve(output);
    });
  });
}
export async function transcribe(audio, language, signal) {
  if (!process.env.WHISPER_MODEL_PATH)
    throw new Error('Yerel STT için WHISPER_MODEL_PATH yapılandırılmalı.');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'prometheus-stt-'));
  const file = path.join(dir, 'recording');
  try {
    await fs.writeFile(file, audio, { mode: 0o600 });
    const script = path.join(dir, 'transcribe.py');
    await fs.writeFile(
      script,
      await fs.readFile(fileURLToPath(new URL('../scripts/transcribe.py', import.meta.url))),
      { mode: 0o600 },
    );
    const result = await runProcess(
      process.env.STT_PYTHON || 'python3',
      [script, file, language === 'en-US' ? 'en' : 'tr'],
      { signal },
    );
    const parsed = JSON.parse(result);
    if (typeof parsed.text !== 'string')
      throw new Error('Yerel ses motoru geçerli metin üretmedi.');
    return parsed.text.slice(0, 4000);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
export async function synthesize(text, signal) {
  if (!process.env.PIPER_PATH || !process.env.PIPER_MODEL_PATH)
    throw new Error('Yerel TTS için PIPER_PATH ve PIPER_MODEL_PATH yapılandırılmalı.');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'prometheus-tts-'));
  const file = path.join(dir, 'speech.wav');
  try {
    await runProcess(
      process.env.PIPER_PATH,
      ['--model', process.env.PIPER_MODEL_PATH, '--output_file', file],
      { input: text, signal },
    );
    const stat = await fs.stat(file);
    if (stat.size > 16 * 1024 * 1024) throw new Error('Ses yanıtı çok büyük.');
    return await fs.readFile(file);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
