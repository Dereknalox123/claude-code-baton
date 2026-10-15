// UserPromptSubmit + PostToolUse hook: once the session's context passes a threshold, asks Claude to stop at the next
// natural break and recommend /baton:handoff. PostToolUse covers long autonomous runs (a plan executed without user messages).
// Context size = the last main-thread reply's input + cache tokens, read from the transcript's tail; costs no tokens.
// Nudges once on crossing BATON_NUDGE_TOKENS (default 300000), then again every 50k more; the nudge stays in context.
// Subagent tool calls (agent_id present) are skipped. Silent on any error: a nudge never blocks work.
import { closeSync, fstatSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const THRESHOLD = Number(process.env.BATON_NUDGE_TOKENS) || 300_000;
const STEP = 50_000;
const TAIL_BYTES = 1_000_000;

function lastContextTokens(path) {
  const fd = openSync(path, "r");
  try {
    const size = fstatSync(fd).size;
    const start = Math.max(0, size - TAIL_BYTES);
    const buf = Buffer.alloc(size - start);
    readSync(fd, buf, 0, buf.length, start);
    const lines = buf.toString("utf8").split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      if (!lines[i].includes('"type":"assistant"')) continue;
      try {
        const entry = JSON.parse(lines[i]);
        const u = entry.message?.usage;
        if (entry.isSidechain || !u) continue;
        return (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
      } catch { /* the first line of the tail may be cut */ }
    }
  } finally { closeSync(fd); }
  return 0;
}

let input = "";
process.stdin.on("data", (c) => (input += c)).on("end", () => {
  try {
    const hook = JSON.parse(input);
    if (hook.agent_id) return;
    const tokens = lastContextTokens(hook.transcript_path);
    const stateFile = join(tmpdir(), `baton-nudge-${hook.session_id}.json`);
    let nudgedAt = 0;
    try { nudgedAt = JSON.parse(readFileSync(stateFile, "utf8")).nudgedAt; } catch { /* first nudge */ }
    if (tokens < nudgedAt) nudgedAt = 0; // context shrank (compaction): the next crossing nudges again
    if (tokens < Math.max(THRESHOLD, nudgedAt + STEP)) return;
    writeFileSync(stateFile, JSON.stringify({ nudgedAt: tokens }));
    const k = Math.round(tokens / 1000);
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: hook.hook_event_name, additionalContext:
      `Context is at ~${k}k tokens, and every turn re-reads all of it. At the next natural break (a plan task or phase ` +
      `done, work committed, tests green), end your turn and recommend /baton:handoff to the user in one line, then /clear. ` +
      `Mid-task, keep working. If the user declines, wait for the next break.` } }));
  } catch { /* a nudge is optional: never block work */ }
});
