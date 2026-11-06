# rakuda-reels

A daily Japanese explainer reel for the **@rakuda.studio** Instagram, made and posted with nobody's computer on.

Every day at 19:30 JST a GitHub Action ([.github/workflows/reel.yml](.github/workflows/reel.yml)) starts Claude Code
on Naoki's Claude plan. Claude follows [PROMPT.md](PROMPT.md): picks a topic not in [history.json](history.json),
checks the facts on English primary sources, writes the script, has ElevenLabs read it
([tools/voice.mjs](tools/voice.mjs)), draws the animated diagram (`visual.js`), checks the stills and renders the mp4
([tools/render.mjs](tools/render.mjs)). The workflow then posts it ([tools/post.mjs](tools/post.mjs)) and commits the
script, visuals and caption under `reels/<date>-<slug>/`.

The repo is public so Actions minutes are free. No secret is in it: the Instagram token is kept encrypted in
`state/ig-token.enc` (key in the `TOKEN_KEY` secret).

## Secrets (Settings → Secrets and variables → Actions)

| Secret | What | Where it came from |
|---|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | Claude Code on the Claude plan (1 year) | `claude setup-token` |
| `ELEVENLABS_API_KEY` | the voice (`eleven_v4`, Rakuda's voices) | Kaminari `RAKUDA_ELEVENLABS_API_KEY` |
| `IG_TOKEN` | Instagram token for @rakuda.studio with `instagram_business_content_publish` (seed only; refreshed every run) | Meta app "Rakuda Reels" → Instagram API setup → Generate token |
| `TOKEN_KEY` | encrypts the refreshed Instagram token in `state/` | random |

## Run by hand

Actions → **Daily reel** → Run workflow. Leave "publish" off to make a reel without posting (the mp4 and stills are in
the run's artifacts); tick it to post.

Locally (needs Google Chrome and ffmpeg):

```bash
npm ci
mkdir -p reels/_test && cp examples/* reels/_test/
ELEVENLABS_API_KEY=… node tools/voice.mjs reels/_test
node tools/render.mjs reels/_test --preview   # preview.jpg
node tools/render.mjs reels/_test             # reel.mp4
```

## Layout of a frame

[lib/template.html](lib/template.html): title pill at the top, the reel's own visual in the 1080×1000 stage, the
caption box lighting up character by character from the voice's own timing, the `編集ソフト | www.rakuda.studio` credit,
and the Rakuda end card from 「この動画は、」 on. [lib/kit.js](lib/kit.js) has the timing helpers;
[examples/](examples/) is a full example (Googleマップの仕組み).
