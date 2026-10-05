import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync("src/telegram-router.js","utf8");
const handler=source.slice(source.indexOf("export async function processTelegramUpdate"),source.indexOf("async function autoWebhook"));

test("text closes a multi-album intake into one vehicle bundle",()=>{
  assert.match(handler,/if\(!mediaGroupId&&!isPhoto&&caption\)/);
  assert.match(handler,/pendingPhotoRows=recent\.filter\(row=>Boolean\(row\.file_id\)&&!clean\(row\.caption\)\)/);
  assert.match(handler,/new Set\(pendingPhotoRows\.map/);
  assert.match(handler,/UPDATE telegram_inbox SET bundle_key=\?,updated_at=CURRENT_TIMESTAMP WHERE chat_id=\? AND bundle_key=\? AND bundle_status='pending'/);
  assert.match(handler,/bundleKey=\`\$\{chatId\}:vehicle:\$\{message\.message_id\}\`/);
});

test("photo-only albums acknowledge cumulative intake while staying pending",()=>{
  const album=handler.slice(handler.indexOf("if(mediaGroupId){"),handler.indexOf("const rows = (await env.DB.prepare",handler.indexOf("if(mediaGroupId){")));
  assert.match(album,/Photo-only albums remain pending/);
  assert.match(album,/if\(hasPhoto&&!hasText\)/);
  assert.match(album,/ĐÃ NHẬN ẢNH XE — \$\{received\} ẢNH/);
  assert.match(album,/không cần gửi lại ảnh/);
  assert.doesNotMatch(album,/UPDATE telegram_inbox SET bundle_status='queued'.*if\(hasPhoto&&!hasText\)/s);
});

test("captioned single album still processes immediately",()=>{
  assert.match(handler,/if\(hasPhoto&&hasText\)/);
  assert.match(handler,/ĐÃ NHẬN ALBUM XE/);
  assert.match(handler,/bundle_status='queued'/);
  assert.doesNotMatch(handler,/await processBundle\(env,bundleKey,chatId\)/);
});
