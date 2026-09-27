const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_TEXT = 12000;

function textFromGemini(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map(part => typeof part?.text === 'string' ? part.text : '').join('\n').trim();
}

export function geminiEnabled(env) {
  return env.GEMINI_ENABLED === 'true';
}

export async function runGeminiPeer(env, task) {
  if (!geminiEnabled(env)) return { ok: false, skipped: true, error: 'gemini_disabled' };
  if (!env.GEMINI_API_KEY) return { ok: false, skipped: true, error: 'gemini_api_key_not_configured' };

  const model = String(env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
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
      return { ok: false, error: 'gemini_http_failed', status: response.status };
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
