// Posts a finished reel to the @rakuda.studio Instagram through the Graph API (Facebook Login for Business: the
// "Rakuda Reels Publisher" system user of the Rakuda business, app "Rakuda Reels"), uploading the mp4 itself
// (resumable upload), so no public hosting is needed. Then it comments the ending's ask under the reel (the Graph API
// cannot pin a comment: pin it in the app if wanted). Rakuda's comment-to-DM bot skips the account's own comments.
//
//   node tools/post.mjs reels/<slug>              check the token, the account and every file a post needs, and stop
//   node tools/post.mjs reels/<slug> --publish    … and publish reel.mp4 with caption.txt, comment, record it in history.json
//   node tools/post.mjs --comment <media_id>      only the comment, under an already posted reel
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const VERSION = 'v23.0';
const API = `https://graph.facebook.com/${VERSION}`;
const PAGE = '1324386664102091'; // the Rakuda Facebook Page, linked to @rakuda.studio
const COMMENT = 'エディターのリンクが欲しい方は「Rakuda」とコメントしてね。DMでお送りします。';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const publish = args.includes('--publish');
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
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function twice(what, fn) { // one retry after a minute: Meta's upload and publish fail now and then for no reason
  try { return await fn(); } catch (e) { console.log(`${what} failed (${e.message}); trying again in 60 s`); await wait(60000); return fn(); }
}
const comment = (media) => twice('comment', () => api('POST', `/${media}/comments`, { message: COMMENT }));

if (args[0] === '--comment') {
  const { id } = await comment(args[1]);
  console.log(`commented ${id} under ${args[1]}`);
  process.exit(0);
}

// 1. everything a post needs, checked before anything is sent (a dry run proves the post step would work)
const dir = path.resolve(args[0]);
const video = path.join(dir, 'reel.mp4');
const size = fs.existsSync(video) ? fs.statSync(video).size : 0;
if (size < 100000) throw new Error(`${video} is missing or empty`);
const caption = fs.readFileSync(path.join(dir, 'caption.txt'), 'utf8').trim();
if (!caption) throw new Error('caption.txt is empty');
const reel = JSON.parse(fs.readFileSync(path.join(dir, 'reel.json'), 'utf8'));
const { instagram_business_account: ig } = await api('GET', `/${PAGE}`, { fields: 'instagram_business_account' });
if (!ig) throw new Error('the Rakuda Page has no linked Instagram account visible to this token');
const me = await api('GET', `/${ig.id}`, { fields: 'username' });
console.log(`posting as @${me.username}: ${(size / 1e6).toFixed(1)} MB, caption ${caption.length} chars`);
if (!publish) process.exit(0);

// 2. a reel container, the mp4 uploaded into it, then published once Instagram has processed it
async function container() {
  const box = await api('POST', `/${ig.id}/media`, { media_type: 'REELS', upload_type: 'resumable', caption });
  // rupload sometimes answers "ProcessingFailedError" although the bytes arrived (the container still turns FINISHED),
  // so an upload error is only logged and the container status decides
  const up = JSON.parse(execFileSync('curl', ['-s', '-X', 'POST',
    box.uri ?? `https://rupload.facebook.com/ig-api-upload/${VERSION}/${box.id}`,
    '-H', `Authorization: OAuth ${token}`, '-H', 'offset: 0', '-H', `file_size: ${size}`,
    '--data-binary', `@${video}`], { encoding: 'utf8', maxBuffer: 1 << 20 }) || '{}');
  if (!up.success) console.log(`upload answered ${JSON.stringify(up).slice(0, 300)}; checking the container`);
  for (let i = 0; ; i++) {
    const { status_code, status } = await api('GET', `/${box.id}`, { fields: 'status_code,status' });
    if (status_code === 'FINISHED') return box.id;
    if (status_code === 'ERROR' || status_code === 'EXPIRED' || i > 60) throw new Error(`processing: ${status_code} ${status ?? ''}`);
    await wait(10000);
  }
}
const ready = await twice('upload', container);
const { id } = await twice('publish', () => api('POST', `/${ig.id}/media_publish`, { creation_id: ready }));
const { permalink } = await api('GET', `/${id}`, { fields: 'permalink' });
console.log(`published ${permalink}`);

const histFile = path.join(root, 'history.json');
const history = JSON.parse(fs.readFileSync(histFile, 'utf8'));
const row = { date: new Date().toISOString().slice(0, 10), slug: path.basename(dir), title: reel.title, topic: reel.topic, media_id: id, permalink };
history.push(row);
fs.writeFileSync(histFile, JSON.stringify(history, null, 1) + '\n');

// 3. the comment under it (the post stands even if this fails; the run then fails and says so)
const c = await comment(id);
row.comment_id = c.id;
fs.writeFileSync(histFile, JSON.stringify(history, null, 1) + '\n');
console.log(`commented ${c.id}`);
