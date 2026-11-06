# rakuda-reels

A daily Japanese explainer reel for the **@rakuda.studio** Instagram, made by the real Rakuda engine and posted with
nobody's computer on.

Every day at 16:30 JST a GitHub Action ([.github/workflows/reel.yml](.github/workflows/reel.yml)) runs on Naoki's
Claude plan (Claude Code, `CLAUDE_CODE_OAUTH_TOKEN`); no Rakuda credits and no model API keys:

1. **Topic and script**: Claude Code researches what is interesting and going viral in explainer shorts, picks a topic
   not in [history.json](history.json), checks the facts on primary sources and writes the script by Rakuda's own
   script rules ([prompts/script.md](prompts/script.md)).
2. **Edit**: the Rakuda engine (private repo, checked out read-only with a deploy key) reads it with an ElevenLabs
   voice, exactly as 「AIに全部おまかせ」 does ([tools/project.mjs](tools/project.mjs)), then `pipeline.py hear` (plan,
   design, every section's visual built and reviewed by its director, captions, sound) and `export`. The engine's
   local "Claude Code" mode sends every model call to the claude CLI.
3. **Review**: Claude Code reviews the export as a creative director against Rakuda's `QUALITY` bar and pre-post review
   ([prompts/review.md](prompts/review.md)); weak sections are redone with `pipeline.py revise`, up to two rounds. A
   small flaw is a `quick` revise (the component edited in place, minutes); only a wrong or broken visual is planned
   and built again. A reel that does not pass is not posted (the run fails and GitHub mails the owner).
4. **Post**: at 20:00 JST, [tools/post.mjs](tools/post.mjs) checks every file, uploads the mp4 to Instagram (Graph
   API, resumable upload; upload and publish are retried once), records it in history.json and comments
   「エディターのリンクが欲しい方は「Rakuda」とコメントしてね。DMでお送りします。」 under it (the API cannot pin a
   comment; pin it in the app if wanted). A reel that passed review but was not posted fails the run and opens a
   GitHub issue saying how to post it by hand.

Each run's summary has a timing table (model calls per engine step, export frames and encode), from the engine's own
`events.jsonl` and `trace/calls.jsonl`, which are kept in the run's artifact ([tools/timing.mjs](tools/timing.mjs)).

The repo is public so Actions minutes are free; nothing private is in it.

## The ending and comment DMs

Every reel ends with 「この動画は全て、AI動画編集ツール「Rakuda」で編集しました。ツールが気になる方は、「Rakuda」とコメントしてください。」
and the caption says the same plus 「DMでリンクをお送りします。」 ([prompts/script.md](prompts/script.md); the review fails a reel
without it). The DM itself is sent by the Rakuda server, not this repo: whoever comments Rakuda / ラクダ / らくだ on a
post from the last 7 days gets one private reply with the link (rakuda `web/lib/comment-dm.ts`, docs/hosting.md ›
Comment DMs). It uses the same system user token as `IG_TOKEN` here, and skips the account's own comments (the one
post.mjs leaves under each reel). `node tools/post.mjs --comment <media_id>` adds that comment to a reel posted by hand.

## Secrets (Settings → Secrets and variables → Actions)

| Secret | What | Where it came from |
|---|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | Claude Code on the Claude plan (1 year) | `claude setup-token` ([tools/connect.sh](tools/connect.sh)) |
| `IG_TOKEN` | Meta system user "Rakuda Reels Publisher" (Rakuda business), app "Rakuda Reels", never expires; also Kaminari `RAKUDA_IG_TOKEN` and the Rakuda server's Fly secret `IG_TOKEN` (comment DMs) | Business settings → System users → トークンを生成 ([tools/connect.sh](tools/connect.sh) `ig`) |
| `ELEVENLABS_API_KEY` | the voice | Kaminari `RAKUDA_ELEVENLABS_API_KEY` |
| `RAKUDA_DEPLOY_KEY` | read-only deploy key of tamura7091/rakuda | generated for this repo |
| `CHANNEL_JSON` | the channel's learnings (what worked on our reels), for the engine | rakuda/data/channels/6c5e10a070d9/channel.json |

## Run by hand

Actions → **Daily reel** → Run workflow. Leave "publish" off to make and review a reel without posting (the mp4 is in
the run's artifacts); tick it to post.

Not in CI: Blender hero shots (they need a GPU; Rakuda's own server runs without them too).
