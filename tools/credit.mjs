// Adds the BGM's credit to the caption when its licence asks for one (CC BY): the engine's BGM plugin records the
// track it picked in the project's structure.json `music` ({title, creator, license, credit}); CC0 owes none.
//
//   node tools/credit.mjs reels/<dir> <project dir>
import fs from 'node:fs';
import path from 'node:path';

const [reelDir, proj] = process.argv.slice(2);
const music = JSON.parse(fs.readFileSync(path.join(proj, 'structure.json'), 'utf8')).music;
const file = path.join(reelDir, 'caption.txt');
const caption = fs.readFileSync(file, 'utf8').trimEnd();
if (!music) console.log('no BGM in this reel');
else if (!/^CC BY/.test(music.license ?? '')) console.log(`BGM ${music.title} (${music.license}): no credit owed`);
else if (caption.includes('BGM:')) console.log('caption already credits the BGM');
else {
  const line = `BGM: "${music.title}" by ${music.creator} (${music.license})${music.page ? ` ${music.page}` : ''}`;
  fs.writeFileSync(file, `${caption}\n\n${line}\n`);
  console.log(`credited: ${line}`);
}
