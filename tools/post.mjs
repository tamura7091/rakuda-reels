// Posts a finished reel to the @rakuda.studio Instagram through the Graph API (Facebook Login for Business: the
// "Rakuda Reels Publisher" system user of the Rakuda business, app "Rakuda Reels"), hosting the mp4
// (as a release asset of this public repo, which Instagram fetches by URL; needs gh signed in, GH_TOKEN in CI). Then it comments the ending's ask under the reel (the Graph API
// cannot pin a comment: pin it in the app if wanted). Rakuda's comment-to-DM bot skips the account's own comments.
//
//   node tools/post.mjs reels/<slug>              check the token, the account and every file a post needs, and stop
//   node tools/post.mjs reels/<slug> --stage      … and put reel.mp4 up as the release asset, for a later --publish
//   node tools/post.mjs reels/<slug> --publish    … and publish reel.mp4 with caption.txt, comment, record it in history.json
//                                                 (without a local reel.mp4: the staged release asset is what is posted)
//   node tools/post.mjs --ready                   prints the newest reel that passed review, is staged and is not posted yet
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
const stage = args.includes('--stage');
const repo = process.env.GITHUB_REPOSITORY ?? 'tamura7091/rakuda-reels';
const staged = (slug) => { // the mp4 held by the reel's release, or null
  try { return JSON.parse(execFileSync('gh', ['release', 'view', `reel-${slug}`, '-R', repo, '--json', 'assets'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })).assets.find((a) => a.name === 'reel.mp4') ?? null; }
  catch { return undefined; } // no release yet
};

if (args[0] === '--ready') { // a reel made in the last 3 days: an older one is stale, and is left for a person
  const posted = new Set(JSON.parse(fs.readFileSync(path.join(root, 'history.json'), 'utf8')).map((r) => r.slug));
  const since = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
  const slug = fs.readdirSync(path.join(root, 'reels')).sort().reverse().find((s) => {
    if (s.slice(0, 10) < since || posted.has(s)) return false;
    try { return JSON.parse(fs.readFileSync(path.join(root, 'reels', s, 'review.json'), 'utf8')).pass === true && !!staged(s); } catch { return false; }
  });
  if (slug) console.log(`reels/${slug}`);
  process.exit(0);
}

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
let held = staged(path.basename(dir)); // the asset already there (a staged reel, or a post retried by hand)
const local = fs.existsSync(video);
const size = local ? fs.statSync(video).size : held?.size ?? 0;
if (size < 100000) throw new Error(`${video} is missing or empty, and no staged release asset`);
const caption = fs.readFileSync(path.join(dir, 'caption.txt'), 'utf8').trim();
if (!caption) throw new Error('caption.txt is empty');
const reel = JSON.parse(fs.readFileSync(path.join(dir, 'reel.json'), 'utf8'));
const { instagram_business_account: ig } = await api('GET', `/${PAGE}`, { fields: 'instagram_business_account' });
if (!ig) throw new Error('the Rakuda Page has no linked Instagram account visible to this token');
const me = await api('GET', `/${ig.id}`, { fields: 'username' });
console.log(`posting as @${me.username}: ${(size / 1e6).toFixed(1)} MB, caption ${caption.length} chars`);
if (!publish && !stage) process.exit(0);

// 2. the mp4 as an asset of a release of this (public) repo, so Instagram fetches it from a URL: the resumable upload
// (rupload) kept answering ProcessingFailedError and left the container processing for 10+ minutes
const tag = `reel-${path.basename(dir)}`;
if (held === undefined) execFileSync('gh', ['release', 'create', tag, '-R', repo, '--title', tag, '--notes', 'The posted mp4 (Instagram fetches it from here).'], { stdio: 'inherit' });
if (local && held?.size !== size) execFileSync('gh', ['release', 'upload', tag, video, '--clobber', '-R', repo], { stdio: 'inherit' });
const url = `https://github.com/${repo}/releases/download/${tag}/reel.mp4`;
if (stage) { console.log(`staged ${url}`); process.exit(0); }

// 3. a reel container that Instagram fills from the URL, published once it has processed it
async function container() {
  const box = await api('POST', `/${ig.id}/media`, { media_type: 'REELS', video_url: url, caption });
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

// 4. the comment under it (the post stands even if this fails; the run then fails and says so)
const c = await comment(id);
row.comment_id = c.id;
fs.writeFileSync(histFile, JSON.stringify(history, null, 1) + '\n');
console.log(`commented ${c.id}`);
