---
name: deploy
description: Release the ALCKH Working Flow Report to GitHub Pages — syntax-check index.html, bump version.txt so every open browser auto-reloads, commit and push to main, then confirm the live site updated.
disable-model-invocation: true
argument-hint: "[short note about what changed]"
---

# Deploy the Working Flow Report

Release the current `index.html` to https://alckhservice.github.io/alckhworkflow/.
The change note for this release is: $ARGUMENTS

Stop and tell the user at the first step that fails. Never skip a step to "get it out".

## 1. Make sure we're up to date

```bash
git status
git pull --rebase origin main
```

If `git status` shows files other than `index.html`, `version.txt` or files under `.claude/`
as changed, list them and ask whether they belong in this release.

## 2. Syntax-check the app

```bash
node .claude/hooks/check-js.js index.html
```

It must print `OK`. One parse error in any inline `<script>` blanks the whole app for the team.

## 3. Sanity-check what's about to ship

Run `git diff --stat` and `git diff index.html | head -200`. Confirm:
- `firebaseConfig`, `TEAM_EMAIL` and the Firestore path
  (`alckh_working_flow_report` / `shared_state`) are unchanged — unless the user said to change them.
- No `console.log` of client data, no hard-coded test data left behind.

Summarise the change for the user in 1–3 lines.

## 4. Bump version.txt

This is what makes every open browser reload itself (see the script at the top of `index.html`).
Forgetting it leaves the team running the old version.

```bash
node -e "const t=new Date(Date.now()+7*3600e3).toISOString().replace(/\D/g,'').slice(0,14);require('fs').writeFileSync('version.txt',t+'\n');console.log('version.txt ->',t)"
```

(Timestamp is Phnom Penh time, `YYYYMMDDHHMMSS`.)

## 5. Commit and push

```bash
git add index.html version.txt
git commit -m "Release: <the change note, or your 1-line summary>"
git push origin main
```

`git push` asks for permission — that's intentional.

## 6. Confirm it's live

GitHub Pages usually takes 1–2 minutes. Then fetch
`https://alckhservice.github.io/alckhworkflow/version.txt` and check it matches the new
value. If a Playwright MCP server is available, open the site and confirm the login screen renders.

Report back: the new version number, the commit hash, and that the live site shows it.
