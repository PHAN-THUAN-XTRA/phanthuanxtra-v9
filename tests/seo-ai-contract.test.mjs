import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
const seo=fs.readFileSync(new URL("../src/seo-ai.js",import.meta.url),"utf8");
const entry=fs.readFileSync(new URL("../src/entry.js",import.meta.url),"utf8");
const blog=fs.readFileSync(new URL("../src/blog.js",import.meta.url),"utf8");
test("SEO cron is bounded and idempotent",()=>{assert.match(seo,/const LIMIT=3/);assert.match(seo,/content_hash/);assert.match(seo,/processed>=LIMIT/);assert.match(seo,/gateway:\{id:"default"/);assert.match(entry,/reconcileSeo/);});
test("SEO metadata cannot choose canonical URL",()=>{assert.match(blog,/https:\/\/phanthuanxtra\.com\/blog\/\$\{encodeURIComponent\(p\.slug\)\}/);assert.doesNotMatch(seo,/canonical/);});
test("SEO generation uses bounded active fast model and persisted fallback",()=>{assert.match(seo,/@cf\/meta\/llama-3\.1-8b-instruct-fast/);assert.match(seo,/clean\\(x\\.title,60\\)/);assert.match(seo,/clean\\(x\\.description,160\\)/);assert.match(blog,/seo_description\|\|p\.excerpt/);});
