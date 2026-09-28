import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const worker=fs.readFileSync("src/index.js","utf8");

test("media delivery supports explicit AVIF and WebP variants",()=>{
  assert.match(worker,/format:'avif'/);
  assert.match(worker,/image\\\/webp/);
  assert.match(worker,/quality:76/);
  assert.match(worker,/headers\.set\('vary','Accept'\)/);
});


test("production publishing verifier locks canonical WebP plus cache-safe AVIF/WebP variants",()=>{
  const verifier=fs.readFileSync("scripts/verify-publishing-production.mjs","utf8");
  assert.match(verifier,/Accept:'image\/jpeg'/);
  assert.match(verifier,/\?format=webp/);
  assert.match(verifier,/\?format=avif/);
  assert.match(verifier,/content-type/);
  assert.match(verifier,/canonical WebP \+ explicit WebP \+ AVIF-preference with documented fallback/);
});


test("production publishing verifier contains no escaped statement separators",()=>{
  const verifier=fs.readFileSync("scripts/verify-publishing-production.mjs","utf8");
  assert.doesNotMatch(verifier,/;\\n\s+const (?:webp|avif)=/);
});


test("adaptive WebP response reconstructs optimized response with negotiation headers",()=>{
  const worker=fs.readFileSync("src/index.js","utf8");
  assert.match(worker,/const optimized=await result\.response\(\)/);
  assert.match(worker,/new Headers\(optimized\.headers\)/);
  assert.match(worker,/optimizedHeaders\.set\(['"]vary['"],['"]Accept['"]\)/);
  assert.match(worker,/new Response\(optimized\.body/);
});


test("free-tier image variants use explicit format query keys",()=>{
  const worker=fs.readFileSync("src/index.js","utf8");
  const verifier=fs.readFileSync("scripts/verify-publishing-production.mjs","utf8");
  assert.match(worker,/searchParams\.get\(['"]format['"]\)/);
  assert.match(worker,/requested===['"]avif['"]/);
  assert.match(worker,/requested===['"]webp['"]\?['"]image\/webp['"]/);
  assert.match(verifier,/\?format=webp/);
  assert.match(verifier,/\?format=avif/);
});


test("production variant verifier emits path-specific timeout evidence",()=>{
  const verifier=fs.readFileSync("scripts/verify-publishing-production.mjs","utf8");
  assert.match(verifier,/Timed out after \$\{timeoutMs\}ms: \$\{path\}/);
  assert.match(verifier,/\?format=webp',{timeoutMs:45000}/);
  assert.match(verifier,/\?format=avif',{timeoutMs:45000}/);
  assert.match(verifier,/Publishing image AVIF preference: PASS/);
});


test("production variant gate relies on edge Content-Type, not stripped custom headers",()=>{
  const verifier=fs.readFileSync("scripts/verify-publishing-production.mjs","utf8");
  assert.match(verifier,/\?format=webp/);
  assert.match(verifier,/\?format=avif/);
  assert.match(verifier,/content-type/);
  assert.doesNotMatch(verifier,/headers\.get\(['"]x-pt-xtra-image-format['"]\)/);
});




test("explicit AVIF delivery uses Cloudflare cf.image subrequest with loop guard",()=>{
  const worker=fs.readFileSync("src/index.js","utf8");
  assert.match(worker,/source['"],['"]1['"]/);
  assert.match(worker,/cf:\{image:\{format:'avif',quality:76\}\}/);
  assert.match(worker,/searchParams\.get\(['"]source['"]\)===['"]1['"]/);
});


test("production AVIF preference accepts only AVIF or documented WebP fallback",()=>{
  const verifier=fs.readFileSync("scripts/verify-publishing-production.mjs","utf8");
  assert.match(verifier,/image\\\/\(\?:avif\|webp\)/);
  assert.match(verifier,/documented WebP fallback/);
  assert.doesNotMatch(verifier,/image\\\/jpeg.*AVIF preference/);
});


test("production publishing upload allows privacy pipeline latency without weakening assertions",()=>{
  const verifier=fs.readFileSync("scripts/verify-publishing-production.mjs","utf8");
  assert.match(verifier,/\/api\/publish\/v1\/media.*timeoutMs:60000/);
  assert.match(verifier,/Publishing image AVIF preference: PASS/);
});
