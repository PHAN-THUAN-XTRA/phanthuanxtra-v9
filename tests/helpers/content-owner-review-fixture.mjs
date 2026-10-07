import fs from 'node:fs';
import { runnerFixture } from './content-runner-fixture.mjs';
import { issueAdminToken } from '../../src/admin-auth.js';
import { handleContentPrepApi } from '../../src/content-prep-api.js';
import { publicationKey } from '../../src/editorial-publishing.js';
import worker from '../../src/entry.js';

export async function ownerReviewFixture() {
  const f = await runnerFixture();
  const migration = fs.readFileSync(new URL('../../migrations/0033_content_owner_review.sql', import.meta.url), 'utf8');
  f.db.sqlite.exec(migration); f.db.sqlite.exec(migration);
  const admin = await issueAdminToken(f.env);
  const create = async (id = 'owner-review-draft-001') => {
    const request = new Request('https://phanthuanxtra.com/api/agents/content/v1/drafts', { method: 'POST', headers: { authorization: 'Bearer ' + f.writer, 'content-type': 'application/json' },
      body: JSON.stringify({ request_id: id, title: 'Nháp thử nghiệm tiếng Việt', content: 'Nội dung riêng tư để owner kiểm tra.', category: 'Tin tức', tags: ['nháp'] }) });
    const result = await (await handleContentPrepApi(request, f.env)).json();
    return { ...result, request_key: await publicationKey(JSON.stringify([f.pipeline, id])) };
  };
  const draft = await create();
  const proposalId = 'owner-review-schedule-001';
  const proposal = await (await handleContentPrepApi(new Request('https://phanthuanxtra.com/api/agents/content/v1/schedule-proposals', { method: 'POST',
    headers: { authorization: 'Bearer ' + f.scheduler, 'content-type': 'application/json' }, body: JSON.stringify({ request_id: proposalId, post_id: draft.post_id, draft_revision: draft.draft_revision, schedule: f.brief.schedule }) }), f.env)).json();
  const proposalKey = await publicationKey(JSON.stringify([f.pipeline, proposalId]));
  const request = (suffix = '', body, method = body ? 'POST' : 'GET', credential = admin) => new Request('https://phanthuanxtra.com/api/admin/agents/content-prep/review' + suffix, {
    method, headers: { ...(credential ? { authorization: 'Bearer ' + credential } : {}), 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {})
  });
  const call = (suffix, body, method, credential) => worker.fetch(request(suffix, body, method, credential), f.env);
  return { ...f, admin, create, draft, proposal, proposalKey, request, call };
}
