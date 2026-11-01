import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export function dataDir() {
  const dir = process.env.PROMETHEUS_DATA_DIR || path.resolve('.prometheus');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}
export function readData(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir(), name + '.json'), 'utf8'));
  } catch {
    return fallback;
  }
}
export function writeData(name, data) {
  const file = path.join(dataDir(), name + '.json');
  const temp = file + '.' + crypto.randomUUID() + '.tmp';
  try {
    fs.writeFileSync(temp, JSON.stringify(data), { mode: 0o600 });
    fs.renameSync(temp, file);
  } finally {
    try {
      fs.unlinkSync(temp);
    } catch {}
  }
}
function vaultKey() {
  if (process.env.PROMETHEUS_VAULT_KEY)
    return Buffer.from(process.env.PROMETHEUS_VAULT_KEY, 'base64');
  const file = path.join(dataDir(), 'vault.key');
  try {
    return fs.readFileSync(file);
  } catch {
    const key = crypto.randomBytes(32);
    fs.writeFileSync(file, key, { mode: 0o600, flag: 'wx' });
    return key;
  }
}
export function readVault() {
  const v = readData('vault', null);
  if (!v) return {};
  const decipher = crypto.createDecipheriv('aes-256-gcm', vaultKey(), Buffer.from(v.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(v.tag, 'base64'));
  return JSON.parse(
    Buffer.concat([decipher.update(Buffer.from(v.data, 'base64')), decipher.final()]).toString(
      'utf8',
    ),
  );
}
export function writeVault(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', vaultKey(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  writeData('vault', {
    iv: iv.toString('base64'),
    data: data.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  });
}
