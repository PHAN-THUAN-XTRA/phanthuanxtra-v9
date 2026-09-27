const DEFAULT_GEMINI_MODEL = 'auto';
const PREFERRED_GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
const MAX_TEXT = 12000;

function textFromGemini(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map(part => typeof part?.text === 'string' ? part.text : '').join('\n').trim();
}

export function geminiEnabled(env) {
  return env.GEMINI_ENABLED === 'true';
}

function normalizedModelName(name) {
  return String(name || '').replace(/^models\//, '').trim();
}

async function discoverGeminiModel(env) {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
    headers: { 'x-goog-api-key': env.GEMINI_API_KEY }
  });
  const raw = await response.text();
  let payload;
  try { payload = JSON.parse(raw); } catch { payload = null; }
  if (!response.ok) {
    return { ok: false, error: 'gemini_model_discovery_failed', status: response.status,
      provider_code: typeof payload?.error?.status === 'string' ? payload.error.status.slice(0, 80) : null };
  }
  const available = (Array.isArray(payload?.models) ? payload.models : [])
    .filter(model => Array.isArray(model?.supportedGenerationMethods) && model.supportedGenerationMethods.includes('generateContent'))
    .map(model => normalizedModelName(model.name)).filter(Boolean);
  const preferred = PREFERRED_GEMINI_MODELS.find(model => available.includes(model));
  const fallback = available.find(model => /gemini-.*flash-lite/i.test(model)) || available.find(model => /gemini-.*flash/i.test(model));
  const model = preferred || fallback || null;
  return model ? { ok: true, model } : { ok: false, error: 'gemini_no_supported_free_model' };
}

export async function runGeminiPeer(env, task) {
  if (!geminiEnabled(env)) return { ok: false, skipped: true, error: 'gemini_disabled' };
  if (!env.GEMINI_API_KEY) return { ok: false, skipped: true, error: 'gemini_api_key_not_configured' };

  const configuredModel = String(env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
  const discovery = configuredModel === 'auto' ? await discoverGeminiModel(env) : { ok: true, model: configuredModel };
  if (!discovery.ok) return discovery;
  const model = discovery.model;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: 'You are the Gemini engineering peer for PHAN THUAN XTRA. Treat the supplied GitHub checkpoint as authoritative. Never invent repository state, deployment evidence, credentials, or tests. Never output secrets. Production mutation is disabled. Separate VERIFIED FACTS from RECOMMENDATIONS and prefer minimal safe changes.'
            }]
          },
          contents: [{
            role: 'user',
            parts: [{
              text: `TASK_ID: ${task.taskId}\nMODE: ${task.mode}\nCHECKPOINT:\n${task.context || ''}\n\nINSTRUCTION:\n${task.instruction}`
            }]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1800 }
        })
      }
    );

    const raw = await response.text();
    let payload;
    try { payload = JSON.parse(raw); } catch { payload = null; }

    if (!response.ok) {
      const providerCode = typeof payload?.error?.status === 'string'
        ? payload.error.status.slice(0, 80)
        : null;
      return {
        ok: false,
        error: 'gemini_http_failed',
        status: response.status,
        provider_code: providerCode
      };
    }

    const output = textFromGemini(payload);
    if (!output) return { ok: false, error: 'gemini_empty_response' };

    return {
      ok: true,
      engine: 'google-gemini',
      model,
      production_mutation: false,
      response: output.slice(0, MAX_TEXT)
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.name === 'AbortError' ? 'gemini_timeout' : 'gemini_request_failed',
      detail: String(error?.message || error).slice(0, 300)
    };
  } finally {
    clearTimeout(timeout);
  }
}
