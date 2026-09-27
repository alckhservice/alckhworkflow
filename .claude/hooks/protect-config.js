#!/usr/bin/env node
// Claude Code PreToolUse hook: asks you to confirm before Claude changes the
// parts of index.html that would break sign-in or cloud sync for the whole team:
//   - the firebaseConfig block (project, API key, app id)
//   - TEAM_EMAIL (the shared team login account)
//   - the Firestore location of the shared data (collection / doc names)
//
// It never blocks outright — it returns "ask", so you see a prompt and decide.

const fs = require('fs');

const PROTECTED = [
  /firebaseConfig/,
  /apiKey\s*:/,
  /authDomain\s*:/,
  /projectId\s*:/,
  /appId\s*:/,
  /TEAM_EMAIL/,
  /collection\(\s*['"]alckh_working_flow_report['"]\s*\)/,
  /doc\(\s*['"]shared_state['"]\s*\)/,
];

// Pull out just the sensitive pieces of a full file so we can compare old vs new.
function fingerprint(text) {
  if (!text) return '';
  const parts = [];
  const cfg = text.match(/const\s+firebaseConfig\s*=\s*\{[\s\S]*?\};/);
  parts.push(cfg ? cfg[0].replace(/\s+/g, ' ') : '');
  const team = text.match(/const\s+TEAM_EMAIL\s*=\s*[^;]+;/);
  parts.push(team ? team[0] : '');
  const ref = text.match(/collection\([^)]*\)\.doc\([^)]*\)/g);
  parts.push(ref ? ref.join('|') : '');
  return parts.join('\n');
}

function touchesProtected(s) {
  return !!s && PROTECTED.some((re) => re.test(s));
}

function ask(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

let input = '';
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', () => {
  let data;
  try { data = JSON.parse(input || '{}'); } catch (e) { process.exit(0); }
  const tool = data.tool_name || '';
  const ti = data.tool_input || {};
  const file = ti.file_path || '';
  if (!/\.html?$/i.test(file)) process.exit(0);

  const reason =
    'This edit changes the Firebase config, the team login (TEAM_EMAIL) or where the shared data ' +
    'is stored in Firestore. A mistake here signs everyone out or points the app at empty data. ' +
    'Approve only if you meant to change it.';

  if (tool === 'Edit') {
    if (touchesProtected(ti.old_string) || touchesProtected(ti.new_string)) ask(reason);
  } else if (tool === 'MultiEdit') {
    for (const e of ti.edits || []) {
      if (touchesProtected(e.old_string) || touchesProtected(e.new_string)) ask(reason);
    }
  } else if (tool === 'Write') {
    let before = '';
    try { before = fs.readFileSync(file, 'utf8'); } catch (e) { /* new file */ }
    if (before && fingerprint(before) !== fingerprint(ti.content)) ask(reason);
  }
  process.exit(0);
});
