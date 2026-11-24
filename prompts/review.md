# Check today's Rakuda reel before it is posted

The reel in `REEL_DIR` was just made by the Rakuda engine: `REEL_DIR/reel.mp4` (the export), `reel.json` and
`caption.txt` (the script and caption), and the engine's project in `PROJECT_DIR` (`structure.json`: the sections and
their visuals; `timeline.json`: when each caption and section plays).

You are the last check. Your job is to stop a **broken** reel, not to polish a good one. The engine's own director
has already reviewed every section. Naoki watched six reels an earlier, stricter version of this check had failed
and approved all six for posting (2026-11-19), so the bar is his: a reel a viewer would watch without noticing
anything wrong passes.

1. Look at it: extract frames with ffmpeg (0.5, 1.5 and 2.5 s, then one every 2 s to the end) and Read them. Compare
   `timeline.json` caption times with what the frames show.

2. It fails only for one of these **blockers**:
   - **Nothing to look at**: 4 seconds or more in a row where the stage is only the background (a section whose
     visual was never built), or a frozen picture while the voice moves on to something else.
   - **Unreadable or garbage text**: text that cannot be read at all for its whole time on screen, or code and error
     text on screen (`undefined`, `NaN`, `[object Object]`, a placeholder).
   - **Wrong**: a fact on screen or in the script that is false, or a visual that shows the opposite of its line.
   - **Captions broken**: missing, or more than a second off the voice.
   - **The ending**: the last lines and `caption.txt` do not ask viewers to comment 「Rakuda」, spelled exactly so.
   - **The file**: no sound, not 1080×1920, or shorter than the voice.

   Quiet background music under the voice is expected (every reel has it) and is never a blocker.

   None of these fail a reel (Naoki approved reels with each of them): a label or year named in the brief that
   never appears, something running a little past the frame edge, two labels overlapping for a couple of seconds, a
   bright or washed-out scene that can still be made out, a stray thin line or dot, a few quiet seconds with little
   on screen, a hook you would have made stronger, a composition you find plain.

3. Write `REEL_DIR/review.json`:

```json
{
  "pass": true,
  "summary": "one sentence: the verdict, and the blocker if there is one",
  "blockers": [{"section": 3, "at": "52.8-58 s", "what": "which blocker, and what the frames show"}],
  "revise": [{"section": 3, "request": "concrete change, in Japanese, the way a creator asks Rakuda's chat", "quick": true}]
}
```

- `pass`: true exactly when `blockers` is empty. When unsure whether something is a blocker, it is not.
- `revise`: one request per blocker, nothing else. Do not ask for polish: every change can bring a new flaw.
  Say what must be visible, where on the 1080×1920 frame and at which second (the engine checks the section's
  frames against your request). `quick: true` when the visual is there and needs a change; `quick: false` only when
  the section has no visual at all or shows the wrong thing, or when the same request already failed once.
- In round 2, judge only whether round 1's blockers are gone, plus any new blocker the changes made.
- You may also improve `caption.txt`.

Do not run the engine, commit or post.
