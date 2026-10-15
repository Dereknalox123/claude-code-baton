// SessionStart hook (startup, clear): when the project has a .claude/handoff.md, tells Claude to resume from it,
// check it is not stale, and delete it once its work is done. Silent when there is no handoff, and on any error.
import { existsSync } from "node:fs";
import { join } from "node:path";

let input = "";
process.stdin.on("data", (c) => (input += c)).on("end", () => {
  try {
    const dir = process.env.CLAUDE_PROJECT_DIR || JSON.parse(input).cwd;
    if (!dir || !existsSync(join(dir, ".claude", "handoff.md"))) return;
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext:
      "A handoff from a previous session exists at .claude/handoff.md. Read it first. Its first line names the HEAD " +
      "commit it was written at; if git log shows later commits it does not account for, it may be stale: tell the " +
      "user before acting on it. Then read the files it lists under Read first, before doing anything else. Delete " +
      "the file once its Next steps are all done, or when the user moves on to unrelated work." } }));
  } catch { /* resuming is optional: never block the session */ }
});
