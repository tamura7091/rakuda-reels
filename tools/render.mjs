// Renders a reel: lib/template.html + the reel's visual.js driven by timeline.json, frame by frame in Chrome, then
// ffmpeg puts the frames and voice.mp3 together.
//
//   node tools/render.mjs reels/<slug> --preview   one still at the middle of every line, tiled into preview.jpg
//   node tools/render.mjs reels/<slug>             every frame → reel.mp4 (1080x1920, 30 fps, H.264 + AAC)
//
// visual.js must draw from t alone (no CSS animations, transitions, timers or requestAnimationFrame): the renderer
// jumps to any t in any order, split across workers.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(process.argv[2]);
const preview = process.argv.includes('--preview');
const tl = JSON.parse(fs.readFileSync(path.join(dir, 'timeline.json'), 'utf8'));
const visual = 'file://' + path.join(dir, 'visual.js');

async function open() {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--force-color-profile=srgb', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('file://' + path.join(root, 'lib', 'template.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(([t, v]) => window.setup(t, v), [tl, visual]);
  const cdp = await page.context().newCDPSession(page);
  const shoot = async (t, file) => {
    await page.evaluate((x) => window.render(x), t);
    if (errors.length) throw new Error(`visual.js at t=${t.toFixed(2)}: ${errors.join(' | ')}`);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true });
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
  };
  return { browser, shoot };
}

if (preview) {
  const out = path.join(dir, 'preview');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out);
  const { browser, shoot } = await open();
  const times = tl.lines.map((l) => (l.start + l.end) / 2);
  for (const [i, t] of times.entries()) await shoot(t, path.join(out, `p${String(i).padStart(2, '0')}.jpg`));
  await browser.close();
  const cols = Math.min(6, times.length);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-pattern_type', 'glob', '-i', path.join(out, 'p*.jpg'),
    '-vf', `scale=270:480,tile=${cols}x${Math.ceil(times.length / cols)}:padding=6:color=white`, '-frames:v', '1', path.join(dir, 'preview.jpg')]);
  console.log(`preview.jpg: ${times.length} stills (line i at the middle of its voice), full-size in preview/`);
  process.exit(0);
}

const frames = path.join(dir, 'frames');
fs.rmSync(frames, { recursive: true, force: true });
fs.mkdirSync(frames);
const total = Math.ceil(tl.duration * tl.fps);
const workers = Math.max(1, Math.min(4, os.availableParallelism() - 1));
const chunk = Math.ceil(total / workers);
let done = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const { browser, shoot } = await open();
  for (let f = w * chunk; f < Math.min(total, (w + 1) * chunk); f++) {
    await shoot(f / tl.fps, path.join(frames, `f${String(f).padStart(5, '0')}.jpg`));
    if (++done % 150 === 0) console.log(`${done}/${total} frames`);
  }
  await browser.close();
}));
execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(tl.fps), '-i', path.join(frames, 'f%05d.jpg'),
  '-itsoffset', String(tl.lead), '-i', path.join(dir, 'voice.mp3'),
  '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-af', 'apad', '-t', String(tl.duration), '-movflags', '+faststart',
  path.join(dir, 'reel.mp4')]);
fs.rmSync(frames, { recursive: true, force: true });
// a cover for Instagram: the frame at the end of the first line (title + first visual + first caption)
execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(tl.lines[0].end), '-i', path.join(dir, 'reel.mp4'), '-frames:v', '1', path.join(dir, 'cover.jpg')]);
console.log(`reel.mp4: ${tl.duration}s, ${total} frames`);
