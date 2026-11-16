#!/usr/bin/env node
/**
 * mcp-launch — turn one small config into the whole "get my MCP server discovered" kit.
 *
 * Zero dependencies. Node 18+. You tell it your server's name, description, endpoint
 * and repo; it generates the exact files the MCP ecosystem's directories want:
 *
 *   server.json                  official MCP Registry manifest (2025-12-11 schema)
 *   .well-known/mcp-registry-auth  domain-verification file to deploy at your apex
 *   glama.json                   Glama connector manifest (claim token placeholder)
 *   CLIENTS.md                   copy-paste config for Claude Desktop / Cursor / VS Code
 *   SUBMIT.md                    where to submit + claim paths + what each directory wants
 *   TDQS.md                      tool-description self-check (Glama 4-part scoring)
 *   CHECKLIST.md                 post-launch 7-day follow-up + common rejection reasons
 *
 * Usage:
 *   node mcp-launch.js init                      # write a starter mcp.config.json
 *   node mcp-launch.js build                     # generate all files from mcp.config.json
 *   node mcp-launch.js build --config path.json --out dist/
 *   node mcp-launch.js validate                  # check config + generated server.json
 */

'use strict';
const fs = require('fs');
const path = require('path');

const SCHEMA = 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json';

const STARTER = {
  name: 'com.example/my-server',        // reverse-DNS: <domain>/<slug> — must match your domain
  title: 'My Server',
  description: 'One clear sentence on what the server lets an AI agent do.',
  version: '1.0.0',
  websiteUrl: 'https://example.com',
  endpoint: 'https://example.com/mcp', // Streamable HTTP URL (or SSE)
  transport: 'streamable-http',         // streamable-http | sse
  repository: { source: 'github', url: 'https://github.com/you/my-server', id: 'you/my-server' },
  authToken: 'REPLACE_WITH_REGISTRY_TOKEN', // from registry publish flow; deploy at /.well-known/mcp-registry-auth
  glamaClaimToken: 'REPLACE_WITH_GLAMA_CLAIM', // from glama.ai claim flow
  tools: [
    { name: 'do_thing', description: 'What it does, what it returns, and when to call it.' },
  ],
};

function readConfig(p) {
  const f = path.resolve(p || 'mcp.config.json');
  if (!fs.existsSync(f)) throw new Error('no config at ' + f + ' — run: node mcp-launch.js init');
  return { cfg: JSON.parse(fs.readFileSync(f, 'utf8')), file: f };
}

function reverseDnsOk(name) {
  // Exactly one slash; left side looks like a domain; right side a slug.
  return typeof name === 'string' && /^[a-z0-9.-]+\/[a-z0-9._-]+$/i.test(name) && name.indexOf('/') === name.lastIndexOf('/');
}
function semverOk(v) { return /^\d+\.\d+\.\d+$/.test(v || ''); }

function buildServerJson(c) {
  const out = {
    $schema: SCHEMA,
    name: c.name,
    description: c.description,
    version: c.version,
  };
  if (c.title) out.title = c.title;
  if (c.websiteUrl) out.websiteUrl = c.websiteUrl;
  if (c.repository && c.repository.url) {
    out.repository = { source: c.repository.source || 'github', url: c.repository.url };
    if (c.repository.id) out.repository.id = c.repository.id;
  }
  const t = c.transport === 'sse' ? 'sse' : 'streamable-http';
  out.remotes = [{ type: t, url: c.endpoint }];
  return out;
}

function clientsMd(c) {
  const url = c.endpoint;
  const conf = `{\n  "mcpServers": {\n    "${(c.title || c.name.split('/')[1]).replace(/[^a-z0-9_-]/gi, '-')}": {\n      "type": "http",\n      "url": "${url}"\n    }\n  }\n}`;
  return `# Client setup — ${c.title || c.name}\n\nRemote, hosted server. No key, no install. Endpoint: \`${url}\`\n\n## Claude Desktop\nAdd to \`claude_desktop_config.json\`:\n\n\`\`\`json\n${conf}\n\`\`\`\n\n## Cursor\nSettings → MCP → Add new global MCP server, same JSON above.\n\n## VS Code (GitHub Copilot)\nAdd to \`.vscode/mcp.json\`:\n\n\`\`\`json\n${conf}\n\`\`\`\n\n> If your server needs auth, add a \`headers\` object with \`Authorization\` inside the server entry. ` +
    `Keep the \`type: "http"\` transport for a remote Streamable HTTP endpoint.\n`;
}

function glamaJson(c) {
  return JSON.stringify({
    $schema: 'https://glama.ai/mcp/schemas/connector.json',
    claim: c.glamaClaimToken || 'REPLACE_WITH_GLAMA_CLAIM',
  }, null, 2) + '\n';
}

function submitMd(c) {
  return `# Submit checklist — ${c.title || c.name}\n\nServer name (reverse-DNS): \`${c.name}\` · version \`${c.version}\`\n\n` +
    `## 1. Official MCP Registry (do this first — most authoritative)\n` +
    `- Validate: \`npx @modelcontextprotocol/cli validate server.json\`\n` +
    `- Publish: \`npx @modelcontextprotocol/cli publish server.json\`\n` +
    `- You get \`${c.name}@${c.version}\`. Verify domain by deploying \`.well-known/mcp-registry-auth\` at **apex** (not just www — the apex-no-redirect trap).\n\n` +
    `## 2. Glama\n` +
    `- Submit connector at https://glama.ai/mcp/servers (the remote/connector path, not the package path).\n` +
    `- Claim via **both** HTTP (host \`glama.json\` at \`${c.endpoint.replace(/\/$/, '')}/.well-known/glama.json\`) and DNS TXT if offered.\n` +
    `- Badge appears after claim: \`https://glama.ai/mcp/servers/<id>/badge\`.\n\n` +
    `## 3. mcp.so (free channel)\n` +
    `- Submit at https://mcp.so/submit using the free path — do not pay the featured fee.\n` +
    `- Paste name, one-line description, endpoint, repo.\n\n` +
    `## 4. mcpservers.org / MCP Market\n` +
    `- Submit the same metadata; these are secondary coverage.\n\n` +
    `## 5. README\n` +
    `- Paste the three client configs from \`CLIENTS.md\`.\n` +
    `- Keep one clear sentence on what the tools do (see \`TDQS.md\`).\n\n` +
    `Common rejection reasons: name not reverse-DNS / domain not verified at apex / description too vague / tool names ambiguous / endpoint not reachable without auth headers declared.\n`;
}

function tdqsMd(c) {
  const tools = (c.tools || []).map((t, i) =>
    `${i + 1}. \`${t.name}\` — ${t.description || '(no description — will be scored 0)'}`
  ).join('\n') || '(no tools listed)';
  return `# Tool description self-check — ${c.title || c.name}\n\nGlama-style TDQS looks at four things. Before submitting, check each:\n\n` +
    `## Your tools\n${tools}\n\n` +
    `## 1. Disambiguation\nEach tool name must be unambiguous out of context. \`search\` is bad; \`search_docs\` is good. Does any pair sound interchangeable?\n\n` +
    `## 2. Naming\nNames should be \`snake_case\`, verb-first, and describe the action — not the internal function.\n\n` +
    `## 3. Tool count\nToo few tools can look like an empty server; too many with vague descriptions look like spam. Ship a coherent small set with sharp descriptions.\n\n` +
    `## 4. Completeness\nEvery tool description should say: **what it does, what it returns, and when to call it**. One-line nouns are not enough.\n\n` +
    `Score yourself 0/1 per section above. Fix anything scoring 0 before you submit.\n`;
}

function checklistMd() {
  return `# Post-launch 7-day check\n\n- [ ] Day 0: server.json published; record the \`name@version\`.\n- [ ] Day 0: apex domain verification file live (curl it — must return the token, no redirect).\n- [ ] Day 1: Glama listing shows as claimed; badge URL returns an image.\n- [ ] Day 1: mcp.so / mcpservers.org entries visible in search.\n- [ ] Day 2: endpoint reachable with the documented transport (no surprise auth).\n- [ ] Day 3: README client configs tested in at least one real client.\n- [ ] Day 7: revisit each directory — note status, fix any rejection, bump version if needed.\n\nRe-check after every version bump: registries cache by version.\n`;
}

function validate(c) {
  const errs = [];
  if (!reverseDnsOk(c.name)) errs.push('name must be reverse-DNS like com.example/my-server (one slash)');
  if (!c.description || c.description.length < 20) errs.push('description too short — write a clear sentence (≥20 chars)');
  if (!semverOk(c.version)) errs.push('version must be semver x.y.z');
  if (!/^https?:\/\//.test(c.endpoint || '')) errs.push('endpoint must be an http(s) URL');
  if (!c.repository || !c.repository.url) errs.push('repository.url is required');
  if (!Array.isArray(c.tools) || !c.tools.length) errs.push('list at least one tool');
  return errs;
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'init') {
    const f = path.resolve(rest[0] || 'mcp.config.json');
    if (fs.existsSync(f)) throw new Error(f + ' already exists');
    fs.writeFileSync(f, JSON.stringify(STARTER, null, 2) + '\n');
    console.log('Wrote starter config:', f, '— edit it, then run: node mcp-launch.js build');
    return;
  }
  if (cmd === 'build' || cmd === 'validate') {
    const cfgArg = rest.indexOf('--config') >= 0 ? rest[rest.indexOf('--config') + 1] : null;
    const outArg = rest.indexOf('--out') >= 0 ? rest[rest.indexOf('--out') + 1] : 'dist';
    const { cfg } = readConfig(cfgArg);
    const errs = validate(cfg);
    if (errs.length) {
      console.error('CONFIG ERRORS:'); errs.forEach((e) => console.error('  - ' + e));
      process.exitCode = 1; return;
    }
    if (cmd === 'validate') {
      // also self-check the generated server.json shape
      const sj = buildServerJson(cfg);
      const need = ['name', 'description', 'version', 'remotes'];
      const missing = need.filter((k) => !(k in sj));
      console.log(missing.length ? 'server.json missing: ' + missing.join(', ') : 'VALID: config + server.json shape OK');
      if (missing.length) process.exitCode = 1;
      return;
    }
    const out = path.resolve(outArg);
    fs.mkdirSync(path.join(out, '.well-known'), { recursive: true });
    const files = {
      'server.json': JSON.stringify(buildServerJson(cfg), null, 2) + '\n',
      '.well-known/mcp-registry-auth': (cfg.authToken || 'REPLACE_WITH_REGISTRY_TOKEN') + '\n',
      'glama.json': glamaJson(cfg),
      'CLIENTS.md': clientsMd(cfg),
      'SUBMIT.md': submitMd(cfg),
      'TDQS.md': tdqsMd(cfg),
      'CHECKLIST.md': checklistMd(),
    };
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(out, name), content);
      console.log('  wrote', path.join(out, name));
    }
    console.log('Done →', out, '(' + Object.keys(files).length + ' files)');
    console.log('Next: validate server.json, deploy .well-known/mcp-registry-auth at your APEX, then follow SUBMIT.md');
    return;
  }
  console.log('mcp-launch — generate the "get my MCP server discovered" kit\n' +
    '  node mcp-launch.js init                 write starter mcp.config.json\n' +
    '  node mcp-launch.js build                generate all assets into dist/\n' +
    '  node mcp-launch.js validate             check config + manifest shape\n' +
    '  options: --config <file>  --out <dir>');
}

if (require.main === module) main();
module.exports = { buildServerJson, validate };
