import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
test("unknown-question handoff uses the approved Vietnamese copy",()=>{
  const source=readFileSync(new URL("../src/ai-chat.js",import.meta.url),"utf8");
  assert.match(source,/Tôi chưa có thông tin xác thực cho câu hỏi này trong dữ liệu PHAN THUẦN XTRA nên sẽ không đoán/);
  assert.match(source,/tôi sẽ chuyển yêu cầu trực tiếp đến anh Phan Thuần qua hệ thống\."/);
  assert.doesNotMatch(source,/qua hệ thống Telegram\/CRM/);
});
