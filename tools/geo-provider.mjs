// Promptfoo custom JS provider: deterministic retrieval checks on synthetic public fixtures.
// No inference, secrets, network, database writes to production, or customer records.
import { fixture } from '../tests/fixtures/ai-discovery.mjs';
import { handleAiDiscovery } from '../src/ai-discovery.js';
export default class GeoProvider {
  id() { return 'ptx-geo-offline'; }
  async callApi(prompt) {
    const paths = ['/car?id=tg-test','/car?id=tg-hidden','/car?id=tg-draft','/cars','/sitemap.xml'];
    if (!paths.includes(prompt)) return {error:'Unknown synthetic fixture route'};
    const {env,sqlite} = fixture();
    try {
      const r = await handleAiDiscovery(new Request('https://phanthuanxtra.com'+prompt),env);
      return {output:JSON.stringify({status:r.status,body:await r.text()}),cost:0};
    } finally { sqlite.close(); }
  }
}
