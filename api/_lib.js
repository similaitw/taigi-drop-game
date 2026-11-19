// 共用：驗證、讀寫雲端題庫（Vercel Blob，私有）
import crypto from 'node:crypto';
import { list, get, put, del } from '@vercel/blob';

export const PREFIX = 'words/';
export const KEEP = 100; // 最多保留幾個版本（每次儲存都是一個備份）
const ID_RE = /^words\/v-\d{15}-\d+\.json$/;

const secret = () => crypto.createHash('sha256').update('taigi-admin:' + (process.env.ADMIN_PASSWORD || '')).digest();
const sign = (exp) => crypto.createHmac('sha256', secret()).update(String(exp)).digest('base64url');
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

export function checkPassword(pw) {
  const real = process.env.ADMIN_PASSWORD || '';
  return real.length > 0 && safeEq(pw || '', real);
}
export function makeToken(hours = 12) { const exp = Date.now() + hours * 3600e3; return `${exp}.${sign(exp)}`; }
export function authed(req) {
  const t = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const [exp, sig] = t.split('.');
  if (!exp || !sig || !/^\d+$/.test(exp) || Date.now() > Number(exp)) return false;
  return safeEq(sig, sign(exp));
}

export function send(res, code, obj, cache = 'no-store') {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.end(JSON.stringify(obj));
}
export async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}

export function isId(id) { return typeof id === 'string' && ID_RE.test(id); }
export function parseId(id) { const m = id.match(/v-(\d{15})-(\d+)\.json$/); return m ? { time: Number(m[1]), count: Number(m[2]) } : null; }

export async function listVersions() {
  const out = []; let cursor;
  do { const r = await list({ prefix: PREFIX, cursor, limit: 1000 }); out.push(...r.blobs); cursor = r.hasMore ? r.cursor : undefined; } while (cursor);
  return out.filter(b => isId(b.pathname)).sort((a, b) => (a.pathname < b.pathname ? 1 : -1));
}
export async function readVersion(id) {
  const r = await get(id, { access: 'private' });
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text());
}

export function cleanWords(words) {
  if (!Array.isArray(words)) throw new Error('資料格式錯誤');
  if (words.length > 3000) throw new Error('詞數太多（上限 3000）');
  const out = [];
  for (const w of words) {
    const hj = String(w?.hj ?? '').trim().slice(0, 40);
    const tl = String(w?.tl ?? '').trim().slice(0, 80);
    const zh = String(w?.zh ?? '').trim().slice(0, 40);
    const lv = Math.min(3, Math.max(1, parseInt(w?.lv, 10) || 1));
    if (hj && zh) out.push({ hj, tl, zh, lv });
  }
  if (out.length < 8) throw new Error('至少需要 8 個詞');
  if (new Set(out.map(w => w.zh)).size < 4) throw new Error('至少需要 4 種不同的華語意思');
  return out;
}

export async function saveVersion(words, note = '') {
  const ts = Date.now();
  const id = `${PREFIX}v-${String(ts).padStart(15, '0')}-${words.length}.json`;
  const data = { updatedAt: new Date(ts).toISOString(), note: String(note).slice(0, 200), count: words.length, words };
  await put(id, JSON.stringify(data), { access: 'private', contentType: 'application/json', addRandomSuffix: false });
  const all = await listVersions();
  const old = all.slice(KEEP);
  if (old.length) await del(old.map(b => b.url));
  return { id, ...data, words: undefined };
}
