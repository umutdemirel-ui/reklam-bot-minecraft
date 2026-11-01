import crypto from 'node:crypto';
const sessions = new Map();
const attempts = new Map();
const digest = (value) => crypto.createHash('sha256').update(value).digest();
export const authEnabled = () => Boolean(process.env.PROMETHEUS_PASSWORD);
export function issueSession(name = 'Prometheus istemcisi') {
  for (const [id, item] of sessions) if (item.expires < Date.now()) sessions.delete(id);
  if (sessions.size >= 20) sessions.delete(sessions.keys().next().value);
  const token = crypto.randomBytes(32).toString('base64url');
  sessions.set(digest(token).toString('hex'), {
    expires: Date.now() + 12 * 3600000,
    name: String(name).slice(0, 80),
    createdAt: new Date().toISOString(),
  });
  return token;
}
function requestToken(req) {
  return (
    req.headers.authorization?.replace(/^Bearer /, '') ||
    req.headers.cookie
      ?.split(';')
      .map((x) => x.trim())
      .find((x) => x.startsWith('prometheus_session='))
      ?.slice(19) ||
    ''
  );
}
export function authenticated(req) {
  const key = digest(requestToken(req)).toString('hex');
  const expiration = sessions.get(key);
  if (expiration && expiration.expires > Date.now()) return true;
  if (expiration) sessions.delete(key);
  return false;
}
export function requireAuth(req, res, next) {
  if (!authEnabled() || authenticated(req)) return next();
  return res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
}
export function requireOwner(req, res, next) {
  if (!authEnabled())
    return res
      .status(403)
      .json({ error: 'Bu işlem için önce PROMETHEUS_PASSWORD tanımlayın ve oturum açın.' });
  return requireAuth(req, res, next);
}
export function registerAuth(app) {
  app.get('/api/session', (req, res) =>
    res.json({ required: authEnabled(), authenticated: authenticated(req) }),
  );
  app.post('/api/session/login', (req, res) => {
    if (!authEnabled())
      return res.status(409).json({ error: 'Sunucuda parola koruması yapılandırılmadı.' });
    const key = req.socket.remoteAddress || 'local';
    const old = attempts.get(key);
    const attempt = old && old.until > Date.now() ? old : { count: 0, until: Date.now() + 60000 };
    if (attempt.count >= 5)
      return res.status(429).json({ error: 'Çok fazla deneme. Bir dakika bekleyin.' });
    attempt.count++;
    attempts.set(key, attempt);
    if (attempts.size > 1000)
      for (const [id, item] of attempts) if (item.until < Date.now()) attempts.delete(id);
    if (
      typeof req.body.password !== 'string' ||
      req.body.password.length > 1024 ||
      !crypto.timingSafeEqual(digest(req.body.password), digest(process.env.PROMETHEUS_PASSWORD))
    )
      return res.status(401).json({ error: 'Parola doğru değil.' });
    attempts.delete(key);
    const token = issueSession(
      typeof req.body.deviceName === 'string' ? req.body.deviceName : 'Web tarayıcısı',
    );
    const secure = req.secure || req.headers.origin?.startsWith('https://');
    res.setHeader(
      'Set-Cookie',
      `prometheus_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure ? '; Secure' : ''}`,
    );
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, ...(req.body.native === true ? { token } : {}) });
  });
  app.get('/api/devices', requireOwner, (req, res) => {
    const current = digest(requestToken(req)).toString('hex');
    res.json(
      [...sessions.entries()]
        .filter(([, value]) => value.expires > Date.now())
        .map(([id, value]) => ({
          id,
          name: value.name,
          createdAt: value.createdAt,
          current: id === current,
        })),
    );
  });
  app.post('/api/devices/:id/revoke', requireOwner, (req, res) => {
    sessions.delete(req.params.id);
    res.json({ ok: true });
  });
  app.post('/api/session/logout', (req, res) => {
    sessions.delete(digest(requestToken(req)).toString('hex'));
    res.setHeader(
      'Set-Cookie',
      'prometheus_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
    );
    res.json({ ok: true });
  });
}
