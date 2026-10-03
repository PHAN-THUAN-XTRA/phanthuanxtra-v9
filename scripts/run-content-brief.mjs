import fs from 'node:fs';
import { runContentBrief } from './content-runner-client.mjs';

const briefFile = process.argv[2];
if (!briefFile || !process.env.CONTENT_WRITER_CREDENTIAL || !process.env.CONTENT_SCHEDULER_CREDENTIAL) {
  console.error('Usage: node scripts/run-content-brief.mjs brief.json [--preview]; requires CONTENT_WRITER_CREDENTIAL and CONTENT_SCHEDULER_CREDENTIAL (token values only).');
  process.exitCode = 2;
} else {
  try {
    const result = await runContentBrief(JSON.parse(fs.readFileSync(briefFile, 'utf8')), {
      writer: process.env.CONTENT_WRITER_CREDENTIAL, scheduler: process.env.CONTENT_SCHEDULER_CREDENTIAL, preview: process.argv.includes('--preview')
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
