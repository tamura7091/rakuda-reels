// Posts a finished reel to the @rakuda.studio Instagram (Instagram API with Instagram Login: graph.instagram.com),
// uploading the mp4 itself (resumable upload), so no public hosting is needed.
//
//   node tools/post.mjs reels/<slug>            refresh the token, check it, and stop (dry run)
//   node tools/post.mjs reels/<slug> --publish  … and publish reel.mp4 with caption.txt, then record it in history.json
//
// The token: a long-lived Instagram token lasts 60 days and is refreshed here on every run. The newest one is kept
// encrypted in state/ig-token.enc (AES-256-GCM, key = the TOKEN_KEY secret), which the workflow commits back, so it
// never runs out while the reel runs daily. IG_TOKEN (secret) seeds it the first time, or after a new token is made.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://graph.instagram.com/v23.0';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE = path.join(root, 'state', 'ig-token.enc');
const dir = path.resolve(process.argv[2]);
const publish = process.argv.includes('--publish');

const key = crypto.createHash('sha256').update(process.env.TOKEN_KEY ?? '').digest();
if (!process.env.TOKEN_KEY) throw new Error('TOKEN_KEY is not set');
function seal(token) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([c.update(token, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString('base64');
}
function unseal(b64) {
  const raw = Buffer.from(b64, 'base64'), d = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8');
}

async function api(method, url, params = {}) {
  const u = new URL(url.startsWith('http') ? url : API + url);
  const opts = { method };
  if (method === 'GET') for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  else opts.body = new URLSearchParams(params);
  const r = await fetch(u, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`${method} ${u.pathname}: ${r.status} ${JSON.stringify(j.error ?? j).slice(0, 400)}`);
  return j;
}

// 1. the newest token, refreshed (Instagram refuses a refresh within 24 h of the last one: then the current one stays)
const seed = process.env.IG_TOKEN;
let token = fs.existsSync(STATE) ? unseal(fs.readFileSync(STATE, 'utf8').trim()) : seed;
if (!token) throw new Error('no Instagram token: set the IG_TOKEN secret');
try {
  token = (await api('GET', 'https://graph.instagram.com/refresh_access_token', { grant_type: 'ig_refresh_token', access_token: token })).access_token;
  console.log('token refreshed');
} catch (e) {
  console.log(`token not refreshed (${e.message.slice(0, 160)})`);
}
fs.mkdirSync(path.dirname(STATE), { recursive: true });
fs.writeFileSync(STATE, seal(token) + '\n');
const me = await api('GET', '/me', { fields: 'user_id,username', access_token: token });
console.log(`posting as @${me.username}`);
if (!publish) process.exit(0);

// 2. a reel container, the mp4 uploaded into it, then published once Instagram has processed it
const video = path.join(dir, 'reel.mp4');
const caption = fs.readFileSync(path.join(dir, 'caption.txt'), 'utf8').trim();
const tl = JSON.parse(fs.readFileSync(path.join(dir, 'timeline.json'), 'utf8'));
const box = await api('POST', `/${me.user_id}/media`, {
  media_type: 'REELS', upload_type: 'resumable', caption, share_to_feed: 'true',
  thumb_offset: String(Math.round(tl.lines[0].end * 1000)), access_token: token,
});
const bytes = fs.readFileSync(video);
const up = await fetch(box.uri ?? `https://rupload.facebook.com/ig-api-upload/v23.0/${box.id}`, {
  method: 'POST', body: bytes,
  headers: { Authorization: `OAuth ${token}`, offset: '0', file_size: String(bytes.length) },
});
if (!up.ok) throw new Error(`upload: ${up.status} ${(await up.text()).slice(0, 400)}`);
for (let i = 0; ; i++) {
  const { status_code, status } = await api('GET', `/${box.id}`, { fields: 'status_code,status', access_token: token });
  if (status_code === 'FINISHED') break;
  if (status_code === 'ERROR' || status_code === 'EXPIRED' || i > 60) throw new Error(`processing: ${status_code} ${status ?? ''}`);
  await new Promise((r) => setTimeout(r, 10000));
}
const { id } = await api('POST', `/${me.user_id}/media_publish`, { creation_id: box.id, access_token: token });
const { permalink } = await api('GET', `/${id}`, { fields: 'permalink', access_token: token });
console.log(`published ${permalink}`);

const histFile = path.join(root, 'history.json');
const history = JSON.parse(fs.readFileSync(histFile, 'utf8'));
const reel = JSON.parse(fs.readFileSync(path.join(dir, 'reel.json'), 'utf8'));
history.push({ date: new Date().toISOString().slice(0, 10), slug: path.basename(dir), title: reel.title, topic: reel.topic, media_id: id, permalink });
fs.writeFileSync(histFile, JSON.stringify(history, null, 1) + '\n');
