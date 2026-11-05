import test from 'node:test';
import assert from 'node:assert/strict';
import { auditMaster, auditMarkdownPaths } from '../scripts/master-integrity-gate.mjs';

const title = '# PHAN THUẦN XTRA — MASTER PROJECT STATUS';
const block = Array.from({ length: 16 }, (_, i) => `- Audit item ${i}: This distinct historical checkpoint contains evidence and a unique verification outcome for integrity testing.`).join('\n');
const fixture = `${title}\n\nDUY NHẤT — CANONICAL PROJECT STATUS\n\n${block}\n`;

test('canonical MASTER passes', () => assert.deepEqual(auditMaster(fixture), []));
test('duplicated title fails', () => assert.match(auditMaster(fixture + fixture).join(' '), /one canonical MASTER title/));
test('pasted history block fails', () => assert.match(auditMaster(fixture + '\n' + block).join(' '), /Duplicated 12-line MASTER block/));
test('truncated history fails', () => assert.match(auditMaster(fixture, fixture.repeat(12)).join(' '), /shrank by more than 10%/));
test('missing canonical declaration fails', () => assert.match(auditMaster(fixture.replace('DUY NHẤT — CANONICAL PROJECT STATUS', 'REMOVED')).join(' '), /declaration missing/));


test('only the canonical Markdown path is allowed', () => {
  assert.deepEqual(auditMarkdownPaths(['MASTER_PROJECT_STATUS.md', 'src/index.js']), []);
  assert.match(auditMarkdownPaths(['MASTER_PROJECT_STATUS.md', 'docs/status.md']).join(' '), /Extra Markdown/);
  assert.match(auditMarkdownPaths(['MASTER_PROJECT_STATUS.md', 'README.MD']).join(' '), /Extra Markdown/);
  assert.match(auditMarkdownPaths(['nested/MASTER_PROJECT_STATUS.md']).join(' '), /Canonical Markdown path missing/);
  assert.match(auditMarkdownPaths([]).join(' '), /Canonical Markdown path missing/);
});

// Spec Kit is non-status tooling; explicit scoped additions must not bypass MASTER protection.
test('approved Spec Kit core does not compete with canonical MASTER', () => {
  const commands = ['analyze', 'checklist', 'clarify', 'constitution', 'converge', 'implement', 'plan', 'specify', 'tasks', 'taskstoissues'];
  const approved = [
    'MASTER_PROJECT_STATUS.md', 'AGENTS.md', 'specs/README.md',
    '.specify/README.md', '.specify/memory/constitution.md',
    ...['checklist', 'constitution', 'plan', 'spec', 'tasks'].map(name => `.specify/templates/${name}-template.md`),
    ...commands.map(name => `.specify/templates/commands/${name}.md`),
    ...commands.map(name => `.agents/skills/speckit-${name}/SKILL.md`)
  ];
  assert.deepEqual(auditMarkdownPaths(approved), []);
});

test('only exact approved agent-desktop docs pass the canonical guard', () => {
  assert.deepEqual(auditMarkdownPaths([
    'MASTER_PROJECT_STATUS.md',
    '.agents/skills/agent-desktop/SKILL.md',
    'docs/AGENT_DESKTOP.md'
  ]), []);
  for (const path of [
    '.agents/skills/agent-desktop/STATUS.md',
    '.agents/skills/agent-desktop/README.md',
    'docs/AGENT_DESKTOP_STATUS.md',
    'docs/agent_desktop.md',
    '.agents/skills/agent-desktop/../evil/SKILL.md',
    'docs/AGENT_DESKTOP.md/../../status.md'
  ]) {
    assert.match(auditMarkdownPaths(['MASTER_PROJECT_STATUS.md', path]).join(' '), /Extra Markdown/);
  }
});

test('bounded feature documents are allowed without enabling extra status', () => {
  assert.deepEqual(auditMarkdownPaths(['MASTER_PROJECT_STATUS.md', 'specs/001-admin-ui/spec.md', 'specs/001-admin-ui/plan.md', 'specs/001-admin-ui/tasks.md']), []);
  assert.deepEqual(auditMarkdownPaths(['MASTER_PROJECT_STATUS.md', 'specs/20261103-150000-gallery/checklists/requirements.md', 'specs/20261103-150000-gallery/contracts/api.md']), []);
});

test('guard rejects arbitrary Markdown, lookalikes, traversal, and missing canonical', () => {
  const blocked = [
    'docs/status.md', 'specs/001-test/MASTER_PROJECT_STATUS.md',
    '.agents/skills/untrusted/SKILL.md', '.specify/extra.md',
    'specs/unapproved/spec.md', 'specs/001-test/contracts/../../dump.md', 'AGENTS.MD'
  ];
  for (const path of blocked) assert.match(auditMarkdownPaths(['MASTER_PROJECT_STATUS.md', path]).join(' '), /Extra Markdown/);
  assert.match(auditMarkdownPaths(['AGENTS.md']).join(' '), /Canonical Markdown path missing/);
});
