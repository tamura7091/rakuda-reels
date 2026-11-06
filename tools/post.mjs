// Posts a finished reel to the @rakuda.studio Instagram through the Graph API (Facebook Login for Business: the
// "Rakuda Reels Publisher" system user of the Rakuda business, app "Rakuda Reels"), uploading the mp4 itself
// (resumable upload), so no public hosting is needed. A system user token does not expire.
//
//   node tools/post.mjs reels/<slug>            check the token and the account, and stop (dry run)
//   node tools/post.mjs reels/<slug> --publish  … and publish reel.mp4 with caption.txt, then record it in history.json
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const VERSION = 'v23.0';
const API = `https://graph.facebook.com/${VERSION}`;
const PAGE = '1324386664102091'; // the Rakuda Facebook Page, linked to @rakuda.studio
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(process.argv[2]);
const publish = process.argv.includes('--publish');
const token = process.env.IG_TOKEN;
if (!token) throw new Error('IG_TOKEN is not set');

async function api(method, url, params = {}) {
  const u = new URL(API + url);
  const opts = { method };
  params = { ...params, access_token: token };
  if (method === 'GET') for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  else opts.body = new URLSearchParams(params);
  const r = await fetch(u, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`${method} ${u.pathname}: ${r.status} ${JSON.stringify(j.error ?? j).slice(0, 400)}`);
  return j;
}

// 1. the Instagram account behind the Page
const { instagram_business_account: ig } = await api('GET', `/${PAGE}`, { fields: 'instagram_business_account' });
if (!ig) throw new Error('the Rakuda Page has no linked Instagram account visible to this token');
const me = await api('GET', `/${ig.id}`, { fields: 'username' });
console.log(`posting as @${me.username}`);
if (!publish) process.exit(0);

// 2. a reel container, the mp4 uploaded into it, then published once Instagram has processed it
const video = path.join(dir, 'reel.mp4');
const caption = fs.readFileSync(path.join(dir, 'caption.txt'), 'utf8').trim();
const box = await api('POST', `/${ig.id}/media`, {
  media_type: 'REELS', upload_type: 'resumable', caption,
});
// rupload sometimes answers "ProcessingFailedError" although the bytes arrived (the container still turns FINISHED),
// so an upload error is only logged and the container status below decides
const size = fs.statSync(video).size;
const up = JSON.parse(execFileSync('curl', ['-s', '-X', 'POST',
  box.uri ?? `https://rupload.facebook.com/ig-api-upload/${VERSION}/${box.id}`,
  '-H', `Authorization: OAuth ${token}`, '-H', 'offset: 0', '-H', `file_size: ${size}`,
  '--data-binary', `@${video}`], { encoding: 'utf8', maxBuffer: 1 << 20 }) || '{}');
if (!up.success) console.log(`upload answered ${JSON.stringify(up).slice(0, 300)}; checking the container`);
for (let i = 0; ; i++) {
  const { status_code, status } = await api('GET', `/${box.id}`, { fields: 'status_code,status' });
  if (status_code === 'FINISHED') break;
  if (status_code === 'ERROR' || status_code === 'EXPIRED' || i > 60) throw new Error(`processing: ${status_code} ${status ?? ''}`);
  await new Promise((r) => setTimeout(r, 10000));
}
const { id } = await api('POST', `/${ig.id}/media_publish`, { creation_id: box.id });
const { permalink } = await api('GET', `/${id}`, { fields: 'permalink' });
console.log(`published ${permalink}`);

const histFile = path.join(root, 'history.json');
const history = JSON.parse(fs.readFileSync(histFile, 'utf8'));
const reel = JSON.parse(fs.readFileSync(path.join(dir, 'reel.json'), 'utf8'));
history.push({ date: new Date().toISOString().slice(0, 10), slug: path.basename(dir), title: reel.title, topic: reel.topic, media_id: id, permalink });
fs.writeFileSync(histFile, JSON.stringify(history, null, 1) + '\n');
