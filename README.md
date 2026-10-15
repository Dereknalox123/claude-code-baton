# baton

A Claude Code plugin that hands a long session off to a fresh context without losing anything.

Long sessions get expensive: every request re-reads the whole context, and each tool call is a request. Baton lets you clear at the right moment and pick up exactly where you left off.

- **`/baton:handoff`** moves every decision still living only in the conversation into the files that own it (specs, roadmap, `CLAUDE.md`, memory), then writes a short `.claude/handoff.md` that points at them.
- **It tells you when.** Once the context passes 300k tokens, Claude recommends a handoff at the next natural break: a plan task or phase done, work committed, tests green. It never interrupts mid-task.
- **The next session picks it up.** After `/clear`, Claude reads the handoff and the files it lists, then continues.
- **Stale handoffs get caught.** The handoff records the commit it was written at; if later commits exist that it does not account for, Claude warns you before acting on it. Once its next steps are done, Claude deletes it.

## Install

Requires Claude Code and Node.js 18+ on your `PATH` (the hooks are small Node scripts).

```
/plugin marketplace add Dereknalox123/claude-code-baton
/plugin install baton@claude-code-baton
```

Or from your shell (Claude Code 2.1.292+):

```
claude plugin install baton --marketplace Dereknalox123/claude-code-baton
```

## Use

1. Work as usual. When Claude recommends it, or whenever you want, run `/baton:handoff`. Optionally pass the next focus: `/baton:handoff finish the auth tests`.
2. Run `/clear`.
3. Send any message, e.g. `continue`.

## How much it saves

An estimate, not a benchmark. At ~200k tokens of context, clearing back to a ~40k start (instructions + handoff + the files it lists) cuts ~160k tokens from every following request: 70-80% less input processed for the rest of the work. Over 50 requests that is roughly 8M fewer input tokens. The handoff itself costs a one-off 20-50k tokens.

How much of that shows up in your plan's usage depends on how cached tokens are counted, which is not public. Measure your own sessions with [`ccusage`](https://github.com/ryoppippi/ccusage): `npx ccusage session`.

Smaller contexts also tend to keep the model sharper on long tasks.

## Configure

| Variable | Default | What it does |
|---|---|---|
| `BATON_NUDGE_TOKENS` | `300000` | Context size at which Claude starts recommending a handoff. It nudges again every 50k more. |

## How it works

| Piece | When | What |
|---|---|---|
| `skills/handoff` | You run `/baton:handoff` | Syncs decisions into their files, writes `.claude/handoff.md`, adds it to `.gitignore`. |
| `hooks/session-start.mjs` | Session start and after `/clear` | If a handoff exists, tells Claude to read it, check it is current, and delete it when done. |
| `hooks/nudge.mjs` | Each prompt and each main-thread tool call | Reads the context size from the local transcript (no tokens spent). Above the threshold, adds a ~70-token note asking Claude to recommend a handoff at the next natural break. Subagent tool calls are skipped. |

The hooks run locally and fail silently: they never block a prompt or a tool call.

## License

[MIT](LICENSE)
