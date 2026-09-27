#!/usr/bin/env node
// Syntax-checks every inline <script> block in index.html.
//
// Two ways to run it:
//   1. As a Claude Code PostToolUse hook: reads the hook JSON from stdin and
//      only checks when the edited file is an .html file.
//   2. By hand / from the /deploy skill:  node .claude/hooks/check-js.js index.html
//
// Exit 0 = all good. Exit 2 = syntax error (Claude Code shows the message to
// Claude so it fixes the error straight away).

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function checkFile(file) {
  const html = fs.readFileSync(file, 'utf8');
  const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  const errors = [];
  let m;
  let block = 0;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1] || '';
    if (/\ssrc\s*=/.test(attrs)) continue;                      // external library, nothing inline
    if (/type\s*=\s*["']?(application\/json|text\/template)/i.test(attrs)) continue;
    block++;
    const code = m[2];
    const startLine = html.slice(0, m.index).split('\n').length; // line of the <script> tag
    const isModule = /type\s*=\s*["']?module/i.test(attrs);
    try {
      if (isModule) {
        // vm.SourceTextModule needs a flag; fall back to a Function-body check.
        new Function(code.replace(/^\s*(import|export)\b.*$/gm, ''));
      } else {
        new vm.Script(code, { filename: `${path.basename(file)}:script#${block}` });
      }
    } catch (e) {
      let where = '';
      const lm = String(e.stack || '').match(/:script#\d+:(\d+)/);
      if (lm) where = ` (around index.html line ${startLine + Number(lm[1]) - 1})`;
      errors.push(`Script block #${block} starting at line ${startLine}${where}: ${e.name}: ${e.message}`);
    }
  }
  return { blocks: block, errors };
}

function report(file) {
  const { blocks, errors } = checkFile(file);
  if (errors.length) {
    console.error(`JavaScript syntax error in ${file}:\n- ` + errors.join('\n- ') +
      '\nThe whole app breaks if any inline script fails to parse. Fix this before continuing.');
    process.exit(2);
  }
  console.log(`OK: ${blocks} inline script block(s) in ${path.basename(file)} parse cleanly.`);
  process.exit(0);
}

// Manual mode
if (process.argv[2]) {
  report(process.argv[2]);
} else {
  // Hook mode
  let input = '';
  process.stdin.on('data', (d) => (input += d));
  process.stdin.on('end', () => {
    let file;
    try {
      const data = JSON.parse(input || '{}');
      file = data.tool_input && (data.tool_input.file_path || data.tool_input.notebook_path);
    } catch (e) {
      process.exit(0);
    }
    if (!file || !/\.html?$/i.test(file) || !fs.existsSync(file)) process.exit(0);
    report(file);
  });
}
