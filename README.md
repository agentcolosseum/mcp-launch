# mcp-launch

You built an MCP server. Nobody can find it. This turns one small config into the **whole "get discovered" kit** the MCP directories actually ask for — in one command, zero dependencies.

Node 18+. No install, no network calls, no account needed to generate files.

## The problem

An MCP server that isn't listed in the Claude / Cursor / VS Code ecosystems effectively doesn't exist. But getting listed means satisfying a dozen different formats: the official Registry wants a `server.json` in reverse-DNS form with a verified domain; Glama wants a connector manifest at a `.well-known` path and a dual claim; mcp.so wants its own submission shape; every README wants three different client configs. It's the same metadata, rewritten five ways, and the failure modes (apex redirect, vague descriptions, ambiguous tool names) are silent.

`mcp-launch` generates all of it from one config, with the traps already handled.

## Usage

```bash
node mcp-launch.js init                 # write mcp.config.json (starter values)
# edit mcp.config.json with your name, endpoint, repo, tools
node mcp-launch.js validate             # catch bad name/version/tools before generating
node mcp-launch.js build                # write all assets into dist/
node mcp-launch.js build --config x.json --out out/
```

## What you get

| File | Purpose |
| --- | --- |
| `server.json` | Official MCP Registry manifest, current `2025-12-11` schema (reverse-DNS name, `remotes`, repository, metadata) |
| `.well-known/mcp-registry-auth` | Domain-verification token to deploy at your **apex** (the no-redirect trap is called out in the checklist) |
| `glama.json` | Glama connector manifest with claim token placeholder — host at `<endpoint>/.well-known/glama.json` |
| `CLIENTS.md` | Copy-paste config for Claude Desktop, Cursor and VS Code / Copilot |
| `SUBMIT.md` | Where to submit (Registry → Glama → mcp.so → mcpservers.org), claim paths, and common rejection reasons |
| `TDQS.md` | Glama-style tool-description self-check: disambiguation, naming, count, completeness |
| `CHECKLIST.md` | Post-launch 7-day follow-up and version-bump reminders |

`validate` checks the things directories reject silently: name must be reverse-DNS (`com.example/my-server`, exactly one slash), version must be `x.y.z`, endpoint must be http(s), at least one tool with a description.

## The craft behind it

This isn't a guess at the formats — it's the playbook we used to get our own server listed: official Registry published, Glama claimed (A grade, badge live), mcprush tool-list grade A, badge in the README. The generator encodes the exact schema (`static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json`) and the failure modes we hit: apex-vs-www verification, the package-vs-connector path on Glama, and vague tool descriptions that score zero.

## Part of a bigger thing

This tool is one cluster in [Agent Colosseum](https://www.theagentcolosseum.com) — a daily spatial-reasoning benchmark where AI agents and humans play the same 15×15 puzzle on a live, server-verified leaderboard. We built the discovery kit for ourselves first, then open-sourced it.

Related clusters:
- [sokoban-solver](https://github.com/agentcolosseum/sokoban-solver) — the dependency-free A* solver behind the benchmark.
- [Agent Colosseum MCP server](https://www.theagentcolosseum.com/mcp) — a live remote server you can point a client at (Streamable HTTP, no key) to see what a listed server looks like in practice.

## License

MIT.
