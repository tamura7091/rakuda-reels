#!/bin/sh
# Puts the two tokens a person has to make by hand into the repo's Actions secrets, without showing them:
#   1. Claude Code on the Claude plan (claude setup-token: sign in, then copy the token it prints)
#   2. the Meta system user token (Business settings → System users → Rakuda Reels Publisher → トークンを生成)
# Each `gh secret set` asks for the value with hidden input: paste, then Enter.
set -e
export GH_TOKEN="$(gh auth token --user tamura7091)"
R=tamura7091/rakuda-reels
if [ "$1" != "ig" ]; then
  echo "1/2 Claude: sign in in the browser, then copy the sk-ant-oat… token printed below"
  claude setup-token
  echo "Paste that Claude token:"
  gh secret set CLAUDE_CODE_OAUTH_TOKEN -R "$R"
fi
echo "2/2 Paste the Meta system user token (Rakuda Reels Publisher):"
gh secret set IG_TOKEN -R "$R"
gh secret list -R "$R"
