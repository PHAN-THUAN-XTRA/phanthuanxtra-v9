import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../scripts/full-system-backup.mjs", import.meta.url), "utf8");

test("backup maps trailing-slash R2 directory markers to a deterministic leaf file", () => {
  assert.match(source, /object\.key\.endsWith\("\/"\)/);
  assert.match(source, /__r2_directory_marker__/);
  assert.match(source, /join\(root,"r2\/objects",relativeObjectPath\)/);
});

test("backup preserves the original R2 object key for API download and manifest", () => {
  assert.match(source, /const encodedKey=object\.key\.split\("\/"\)/);
  assert.match(source, /object-manifest\.json/);
  assert.doesNotMatch(source, /const encodedKey=relativeObjectPath/);
});


test("backup retains native D1 row export and byte-preserved Worker bundles", () => {
  assert.match(source, /output_format: "polling"/);
  assert.match(source, /verifyD1Backup/);
  assert.match(source, /script\.multipart/);
  assert.match(source, /downloadR2Object\(`\/accounts\/\$\{accountId\}\/workers\/scripts/);
  assert.doesNotMatch(source, /result\.results\?\.rows/);
});
