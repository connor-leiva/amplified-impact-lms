// No literal control characters in a tracked text file.
//
// This exists because it happened twice, both times invisibly:
//
//   1. A literal NUL (U+0000) inside a string in apps/api/src/storage.test.ts. Git then classified
//      a 1,200-line security-critical test file as BINARY — ripgrep skipped it silently, `git diff`
//      refused to show its contents, and `* text=auto eol=lf` could not normalise it. The file was
//      unreviewable in a pull request and nobody would have noticed.
//   2. A literal backspace (U+0008) in scripts/gate.mjs, where `\b` was meant. The gate's
//      `--grep "@g[0-7]\b"` became `--grep "@g[0-7]<BS>"`, which silently matches nothing like the
//      intended word boundary. The terminal renders a backspace by erasing, so `sed`, `cat` and
//      every editor displayed the line as if it were correct.
//
// Both came from writing source through a tool that decodes escape sequences: `\0` and `\b` in a
// shell heredoc or a Python string become the BYTE, not the two characters. The fix in code is to
// build them at runtime — `String.fromCharCode(0)` — and the fix in process is this check, because
// "remember not to do that" is not a mechanism.
//
// Tabs, newlines and carriage returns are allowed: tabs appear in Makefiles and test fixtures, and
// CRLF is a line ending this repository normalises through .gitattributes rather than forbids.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * Everything in C0 except TAB (09), LF (0a) and CR (0d), plus DEL.
 *
 * `no-control-regex` is disabled on the next line deliberately, and the irony is the point: that
 * rule exists to catch a control character someone put in a pattern by ACCIDENT, which is the same
 * accident this file exists to catch in source. Here the characters are the subject matter, so the
 * rule has nothing useful to say — and an exemption with a reason is the sanctioned way to say so.
 */
// eslint-disable-next-line no-control-regex
const FORBIDDEN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

/** Extensions whose bytes are not text and are declared `binary` in .gitattributes. */
const BINARY = /\.(png|jpe?g|gif|ico|webp|woff2?|ttf|otf|pdf|zip|mp4|webm)$/i;

const name = (code) => {
  const names = { 0: 'NUL', 7: 'BEL', 8: 'BS', 11: 'VT', 12: 'FF', 27: 'ESC', 127: 'DEL' };
  return names[code] ?? `0x${code.toString(16).padStart(2, '0')}`;
};

// `git ls-files` rather than a glob: only tracked files can reach a reviewer, and it already honours
// .gitignore, so node_modules and build output cost nothing to skip.
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split('\0')
  .filter((f) => f && !BINARY.test(f));

const bad = [];
for (const file of tracked) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue; // a submodule, a broken symlink: not this check's business
  }
  if (!FORBIDDEN.test(text)) continue;
  text.split('\n').forEach((line, i) => {
    for (const [col, ch] of [...line].entries()) {
      const code = ch.codePointAt(0);
      if (FORBIDDEN.test(ch)) bad.push(`${file}:${i + 1}:${col + 1}  ${name(code)}`);
    }
  });
}

if (bad.length) {
  console.error(
    'Literal control characters in tracked text files.\n' +
      'These are invisible in an editor and in `git diff`, and a NUL makes the whole file binary to\n' +
      'git — so grep skips it and a reviewer cannot read it. Build the character at runtime instead,\n' +
      'e.g. String.fromCharCode(0), or write the two-character escape with an editing tool rather\n' +
      'than a heredoc.\n\n' +
      bad.join('\n'),
  );
  process.exit(1);
}
console.log(`check-control-chars: ok (${tracked.length} tracked text file(s) scanned)`);
