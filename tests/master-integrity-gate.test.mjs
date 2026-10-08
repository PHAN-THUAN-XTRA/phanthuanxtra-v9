import test from 'node:test';
import assert from 'node:assert/strict';
import { auditMaster } from '../scripts/master-integrity-gate.mjs';

const title = '# PHAN THUẦN XTRA — MASTER PROJECT STATUS';
const block = Array.from({ length: 16 }, (_, i) => `- Audit item ${i}: This distinct historical checkpoint contains evidence and a unique verification outcome for integrity testing.`).join('\n');
const fixture = `${title}\n\nDUY NHẤT — CANONICAL PROJECT STATUS\n\n${block}\n`;

test('canonical MASTER passes', () => assert.deepEqual(auditMaster(fixture), []));
test('duplicated title fails', () => assert.match(auditMaster(fixture + fixture).join(' '), /one canonical MASTER title/));
test('pasted history block fails', () => assert.match(auditMaster(fixture + '\n' + block).join(' '), /Duplicated 12-line MASTER block/));
test('truncated history fails', () => assert.match(auditMaster(fixture, fixture.repeat(12)).join(' '), /shrank by more than 10%/));
test('missing canonical declaration fails', () => assert.match(auditMaster(fixture.replace('DUY NHẤT — CANONICAL PROJECT STATUS', 'REMOVED')).join(' '), /declaration missing/));
