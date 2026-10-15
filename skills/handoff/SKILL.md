---
name: handoff
description: Save the session state to a handoff file so a fresh session resumes after /clear with nothing lost.
argument-hint: "What will the next session focus on? (optional)"
disable-model-invocation: true
---

The conversation is disposable; the project files are the memory. A handoff moves everything still living only in this conversation into files, then writes a short handoff that points at them.

1. **Sync the durable homes.** Write every decision, finding, and preference from this session into the file that owns it: specs or docs for design decisions, the project's roadmap or status file for progress, `CLAUDE.md` for rules valid for any task, memory for user preferences. Follow the project's own "where learning is written" rules when it has them. Done when no decision exists only in the conversation.

2. **Write `.claude/handoff.md`** in the project root, overwriting the previous one. Pointers over copies; under 400 words. First line: `# Handoff — <date and time> · HEAD <short commit hash>` (`· no git` outside a repo), so the next session can tell a stale handoff from a current one. Then:
   - **Goal**: what the user is working toward, one line.
   - **Done this session**: outcomes with file paths.
   - **Open questions**: questions asked to the user and still unanswered, verbatim.
   - **Next steps**: ordered; each ends on a checkable completion criterion. If the user passed arguments, they set the focus here.
   - **Uncommitted changes**: output of `git status --short`, plus any commit policy the user stated.
   - **Read first**: the 3-6 files the next session reads, in order.
   - **Skills to load**: skills the next steps need.

3. **Keep it out of git**: add `.claude/handoff.md` to `.gitignore` if missing.

4. Tell the user, in one line: the handoff path, and to run `/clear` and then send any message (e.g. `continue`) to resume.
