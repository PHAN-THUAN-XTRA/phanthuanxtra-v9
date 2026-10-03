import fs from 'node:fs';
import { database } from './editorial-db.mjs';
import { issueContentPrepToken } from '../../src/content-prep-auth.js';
import { handleContentRunnerApi } from '../../src/content-runner-api.js';

export const sampleCopy = { title: 'Chuẩn bị xem xe cùng Phan Thuần Xtra', content: 'Khách hàng có thể chuẩn bị danh sách câu hỏi trước buổi xem xe. Giá, tồn kho và lịch hẹn cần được chủ sở hữu xác nhận.', excerpt: 'Những việc cần chuẩn bị trước khi xem xe.', category: 'Tin tức', tags: ['xem xe'] };
export async function runnerFixture({ now = Date.now() } = {}) {
  const db = database();
  for (const name of ['0031_content_prep_contract.sql', '0032_content_prep_runner.sql']) {
    const sql = fs.readFileSync(new URL('../../migrations/' + name, import.meta.url), 'utf8');
    db.sqlite.exec(sql); db.sqlite.exec(sql);
  }
  let clock = now, calls = 0;
  const pipeline = 'simulation-' + crypto.randomUUID();
  const env = { DB: db, ADMIN_PASSWORD: crypto.randomUUID(), CONTENT_RUNNER_LIVE_ENABLED: '1', AI: { async run() { calls++; return { response: JSON.stringify(sampleCopy) }; } } };
  const writer = (await issueContentPrepToken(env, { agent_id: 'agent-11', pipeline_id: pipeline, ttl_seconds: 3600 }, clock)).token;
  const scheduler = (await issueContentPrepToken(env, { agent_id: 'agent-19', pipeline_id: pipeline, ttl_seconds: 3600 }, clock)).token;
  const brief = { request_id: 'simulated-brief-00001', source: 'Bài nháp thử nghiệm: chuẩn bị câu hỏi trước khi xem xe. Mọi giá, tồn kho và lịch hẹn cần chủ sở hữu xác nhận.', instruction: 'Viết ngắn gọn bằng tiếng Việt.', schedule: new Date(clock + 86400000 + 7 * 3600000).toISOString().slice(0, 16).replace('T', ' ') };
  const request = (body = brief, path = '', method = 'POST', w = writer, s = scheduler) => new Request('https://phanthuanxtra.com/api/agents/content/v1/runs' + path, { method,
    headers: { authorization: 'Bearer ' + w, 'x-content-scheduler-credential': 'Bearer ' + s, 'content-type': 'application/json' }, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) });
  const transport = req => handleContentRunnerApi(req, env, { now: clock, timeoutMs: 25 });
  const wait = async ms => { clock += ms; };
  return { db, env, pipeline, writer, scheduler, brief, request, transport, wait, calls: () => calls, now: () => clock, tick: ms => { clock += ms; } };
}
