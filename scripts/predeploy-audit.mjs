#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const base = process.argv[2];
const head = process.argv[3] || 'HEAD';
if (!base) process.exit(2);
const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
const names = git(['diff','--name-only',base,head]).trim().split('\n').filter(Boolean);
const patch = git(['diff','--unified=0',base,head,'--','*.js','*.mjs','*.html','*.yml','*.yaml','*.json','*.toml']);
const added = patch.split('\n').filter((x) => x.startsWith('+') && !x.startsWith('+++')).map((x) => x.slice(1));
const findings = [];
const add = (severity, rule, evidence) => findings.push({ severity, rule, evidence: evidence.slice(0,180) });
const scan = (regex, severity, rule) => { for (const line of added) if (regex.test(line)) add(severity, rule, line); };

scan(/(?:api[_-]?key|token|secret|password)\s*[:=]\s*['"][^'"$]{8,}['"]/i,'BLOCKER','Possible hard-coded credential');
scan(/authorization\s*[:=]\s*['"]bearer\s+[A-Za-z0-9._-]{12,}/i,'BLOCKER','Possible hard-coded bearer token');
scan(/console\.(?:log|info|debug)\([^)]*(?:token|secret|password|authorization)/i,'HIGH','Sensitive value may be logged');
scan(/innerHTML\s*=|insertAdjacentHTML\s*\(/i,'HIGH','HTML injection sink added');
scan(/Access-Control-Allow-Origin['"]?\s*[:,=]\s*['"]\*/i,'HIGH','Wildcard CORS added');
scan(/while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/,'HIGH','Unbounded loop added');
scan(/\.prepare\([^\n]*\$\{/i,'HIGH','Possible dynamic D1 SQL interpolation');
scan(/env\.AI\.run\s*\(/,'MEDIUM','Workers AI inference added; verify quota/fallback');
scan(/notifyTelegram|sendMessage|api\.telegram\.org/i,'MEDIUM','Telegram path changed; exactly-once test required');
scan(/\.delete\s*\(/,'MEDIUM','Delete operation changed; verify authorization/post-delete');
scan(/cache-control|caches\.|cache\.put|cache\.match/i,'MEDIUM','Cache behavior changed; verify stale/auth behavior');

const behavior = names.filter((n) => /^(src|public|scripts|android\/app\/src)\//.test(n));
const tests = names.filter((n) => /(^|\/)(test|tests)\//.test(n) || /\.test\.[cm]?js$/.test(n));
if (behavior.length && !tests.length) add('HIGH','Behavior-changing files changed without targeted regression test changes',behavior.join(', '));

const blockers = findings.filter((f) => f.severity === 'BLOCKER' || f.severity === 'HIGH');
console.log('AI Pre-Deploy deterministic audit');
console.log('Changed files:', names.length ? names.join(', ') : '(none)');
for (const f of findings) console.log('['+f.severity+'] '+f.rule+': '+f.evidence);
if (!findings.length) console.log('[PASS] No deterministic audit findings.');
if (blockers.length) { console.error('DEPLOY LOCKED: '+blockers.length+' unresolved BLOCKER/HIGH finding(s).'); process.exit(1); }
console.log('DEPLOY ELIGIBLE at deterministic audit layer. Runtime/CI evidence still required.');
