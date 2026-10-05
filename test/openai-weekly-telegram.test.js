import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {fallbackDigest,parseReleaseNotesHtml,shouldRunWeekly,weeklyKey} from "../src/openai-weekly-telegram.js";

test("OpenAI weekly digest becomes due Monday at 08:00 Vietnam and dedupes by local date",()=>{
  const due=Date.parse("2026-10-12T01:00:00Z");
  assert.equal(shouldRunWeekly(due),true);
  assert.equal(weeklyKey(due),"2026-10-12");
  assert.equal(shouldRunWeekly(Date.parse("2026-10-12T00:55:00Z")),false);
  assert.equal(shouldRunWeekly(Date.parse("2026-10-13T01:00:00Z")),false);
});

test("OpenAI release notes parser extracts only recent dated entries",()=>{
  const html=`<article><span>ChatGPT</span><time>Oct 2, 2026</time><span>GA</span><h2>Finances expands to Free and Go users</h2></article>
    <article><span>Codex</span><time>Sep 29, 2026</time><span>GA</span><h2>GPT-6.1 Sol in Codex, ChatGPT Work, and the API</h2></article>
    <article><span>API</span><time>Sep 1, 2026</time><h2>Old item</h2></article>`;
  const out=parseReleaseNotesHtml(html,Date.parse("2026-10-06T00:00:00Z"));
  assert.equal(out.sawDate,true);
  assert.equal(out.items.length,2);
  assert.equal(out.items[0].product,"ChatGPT");
  assert.match(out.items[0].title,/Finances expands/);
});

test("fallback Telegram digest cites the official OpenAI release notes",()=>{
  const text=fallbackDigest([{product:"ChatGPT",date:"Oct 2, 2026",title:"Finances expands to Free and Go users"}],Date.parse("2026-10-06T00:00:00Z"));
  assert.match(text,/openai\.com\/products\/release-notes/);
  assert.match(text,/Finances expands/);
});

test("Worker scheduled handler integrates weekly Telegram digest without adding a second cron",()=>{
  const entry=fs.readFileSync("src/entry.js","utf8");
  const wrangler=JSON.parse(fs.readFileSync("wrangler.json","utf8"));
  assert.match(entry,/reconcileOpenAiWeeklyTelegram/);
  assert.deepEqual(wrangler.triggers?.crons,["*/5 * * * *"]);
});


test("weekly digest keeps schema changes in migrations, never runtime DDL",()=>{
  const source=fs.readFileSync("src/openai-weekly-telegram.js","utf8");
  const migration=fs.readFileSync("migrations/0034_openai_weekly_digest.sql","utf8");
  assert.doesNotMatch(source,/CREATE\\s+TABLE/i);
  assert.match(migration,/CREATE TABLE IF NOT EXISTS openai_weekly_digest_runs/);
  assert.match(source,/INSERT OR IGNORE INTO openai_weekly_digest_runs/);
  assert.match(source,/updated_at<=datetime\\('now','-15 minutes'\\)/);
});
