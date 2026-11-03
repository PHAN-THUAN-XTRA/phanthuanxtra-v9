#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

export function auditMaster(content, previous = null) {
  const errors = [];
  const title = '# PHAN THUẦN XTRA — MASTER PROJECT STATUS';
  const lines = content.split('\n');
  const count = lines.filter(line => line.trim() === title).length;
  if (count !== 1) errors.push(`Expected one canonical MASTER title; found ${count}`);
  if (!content.includes('DUY NHẤT — CANONICAL PROJECT STATUS')) errors.push('Canonical status declaration missing');
  if (content.length < 1000) errors.push('MASTER unexpectedly short');
  const windows = new Map();
  for (let i = 0; i + 12 <= lines.length; i++) {
    const group = lines.slice(i, i + 12);
    const block = group.join('\n');
    if (block.length < 450 || group.filter(s => s.trim()).length < 9) continue;
    const first = windows.get(block);
    if (first !== undefined && i - first >= 12) {
      errors.push(`Duplicated 12-line MASTER block at lines ${first + 1} and ${i + 1}`);
      break;
    }
    windows.set(block, i);
  }
  if (previous !== null) {
    const oldLines = previous.split('\n');
    if (oldLines.length > 100 && lines.length < oldLines.length * 0.9)
      errors.push(`MASTER shrank by more than 10% (${oldLines.length} -> ${lines.length} lines)`);
  }
  return errors;
}

// Explicit non-status documentation allowance for reviewed github/spec-kit.
// This does not permit a second canonical project status document.
const APPROVED_SPECKIT_MARKDOWN = new Set([
  'AGENTS.md',
  'specs/README.md',
  '.specify/README.md',
  '.specify/memory/constitution.md',
  ...['checklist', 'constitution', 'plan', 'spec', 'tasks'].map(name => `.specify/templates/${name}-template.md`),
  ...['analyze', 'checklist', 'clarify', 'constitution', 'converge', 'implement', 'plan', 'specify', 'tasks', 'taskstoissues'].map(name => `.specify/templates/commands/${name}.md`),
  ...['analyze', 'checklist', 'clarify', 'constitution', 'converge', 'implement', 'plan', 'specify', 'tasks', 'taskstoissues'].map(name => `.agents/skills/speckit-${name}/SKILL.md`)
]);
const ALLOWED_FEATURE_DOCUMENT = /^specs\/(?:\d{3}|\d{8}-\d{6})-[a-z0-9]+(?:-[a-z0-9]+)*\/(?:(?:spec|plan|tasks|research|data-model|quickstart)\.md|(?:checklists|contracts)\/[a-z0-9]+(?:[-._][a-z0-9]+)*\.md)$/;

export function auditMarkdownPaths(paths) {
  const markdown = paths.filter(path => /\.md$/i.test(path));
  const errors = [];
  if (!markdown.includes('MASTER_PROJECT_STATUS.md')) errors.push('Canonical Markdown path missing');
  const extra = markdown.filter(path => path !== 'MASTER_PROJECT_STATUS.md' && !APPROVED_SPECKIT_MARKDOWN.has(path) && !ALLOWED_FEATURE_DOCUMENT.test(path));
  if (extra.length) errors.push(`Extra Markdown paths forbidden: ${extra.join(', ')}`);
  return errors;
}

function main() {
  const path = 'MASTER_PROJECT_STATUS.md';
  const current = fs.readFileSync(path, 'utf8');
  let previous = null;
  if (process.argv[2]) {
    try {
      previous = execFileSync('git', ['show', `${process.argv[2]}:${path}`], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    } catch (error) {
      console.error('[FAIL] Cannot read MASTER at base revision:', error.message);
      process.exit(2);
    }
  }
  const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  const errors = [...auditMaster(current, previous), ...auditMarkdownPaths(paths)];
  errors.forEach(error => console.error('[FAIL]', error));
  if (errors.length) process.exit(1);
  console.log('[PASS] MASTER Integrity Gate: canonical title, duplication and history checks');
}
if (process.argv[1] && /master-integrity-gate\.mjs$/.test(process.argv[1])) main();
