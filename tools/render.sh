#!/bin/sh
# Renders an export's frames on many GitHub runners at once (.github/workflows/render.yml), into <project>/frames,
# so the `pipeline.py export` that follows finds every frame and only encodes (a minute). A runner has no GPU: alone it
# renders Rakuda's heavy scenes at about 1.5 frames/s, which made one export take 30 to 60 minutes.
# If the shards fail, it leaves no frames and says so: the export then renders them itself, slowly.
#
#   sh tools/render.sh <project dir>        (needs GH_TOKEN with actions and contents write; RENDER_SHARDS, default 12)
proj=$1; n=${RENDER_SHARDS:-12}
tag="render-${GITHUB_RUN_ID:-local}-$(date +%s)"
work=$(mktemp -d)
start=$(date +%s)
fail() { echo "::warning::sharded render failed ($1); the export renders the frames itself"; gh release delete "$tag" --cleanup-tag -y -R "$GITHUB_REPOSITORY" > /dev/null 2>&1; rm -rf "$proj/frames" "$work"; exit 0; }

# the timeline exactly as `export` writes it (pipeline.py export: the timeline plus where the materials are)
node -e 'const fs=require("fs"),[p,o]=process.argv.slice(1);const t=JSON.parse(fs.readFileSync(p+"/timeline.json"));fs.writeFileSync(o,JSON.stringify({...t,mediaBase:"file://"+require("path").resolve(p)+"/media/"}))' "$proj" "$work/timeline-export.json"
mkdir -p "$proj/media"
tar -czf "$work/input.tar.gz" -C "$work" timeline-export.json -C "$(cd "$proj" && pwd)" media
gh release create "$tag" "$work/input.tar.gz" --prerelease --title "$tag" --notes "temporary: one export's render (tools/render.sh)" -R "$GITHUB_REPOSITORY" > /dev/null || fail "release"
gh workflow run render.yml -R "$GITHUB_REPOSITORY" -f tag="$tag" -f count="$n" || fail "dispatch"
id=""
for i in $(seq 1 40); do
  sleep 5
  id=$(gh run list -R "$GITHUB_REPOSITORY" --workflow render.yml -L 10 --json databaseId,displayTitle -q ".[] | select(.displayTitle == \"render $tag\") | .databaseId" | head -n 1)
  [ -n "$id" ] && break
done
[ -n "$id" ] || fail "the render run did not start"
echo "render run $GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$id ($n shards)"
gh run watch "$id" -R "$GITHUB_REPOSITORY" --exit-status --interval 15 > /dev/null || fail "run $id"
rm -rf "$proj/frames"; mkdir -p "$proj/frames" "$work/out"
gh release download "$tag" -R "$GITHUB_REPOSITORY" -p 'frames-*.tar' -D "$work/out" || fail "download"
for t in "$work"/out/frames-*.tar; do tar -xf "$t" -C "$proj/frames"; done
total=$(node -e 'const t=require(process.argv[1]);console.log(Math.ceil(t.duration*t.fps))' "$work/timeline-export.json")
[ "$(ls "$proj/frames" | grep -c png)" = "$total" ] || fail "frames missing"
gh release delete "$tag" --cleanup-tag -y -R "$GITHUB_REPOSITORY" > /dev/null
rm -rf "$work"
echo "rendered $total frames on $n runners in $(( $(date +%s) - start )) s"
