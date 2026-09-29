import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync("src/telegram-crm-notify.js","utf8");

test("Business Jets synthetic CI leads are silent and deleted after delivery",()=>{
  assert.match(source,/\^CI-BUSINESS-JETS-/);
  assert.match(source,/disable_notification: syntheticBusinessJets/);
  assert.match(source,/deleteMessage/);
  assert.match(source,/cleanupDeleted/);
});

test("synthetic cleanup is scoped to Business Jets source",()=>{
  assert.match(source,/businessJets && \/\^CI-BUSINESS-JETS-/);
});
