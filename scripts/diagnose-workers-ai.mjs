// One minimal production Workers AI probe; never print token values or raw headers.
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_WORKERS_AI_TOKEN;
if (!/^[a-f0-9]{32}$/i.test(account || "") || !token) {
  console.log("Workers AI diagnostic: dedicated token or account missing");
  process.exitCode = 1;
} else {
  const headers = { Authorization: `Bearer ${token}` };
  const safeJson = async response => {
    try { return await response.json(); } catch { return {}; }
  };
  const verify = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
    headers, signal: AbortSignal.timeout(20000)
  });
  const verified = await safeJson(verify);
  console.log("Workers AI token verification:", JSON.stringify({
    http: verify.status, active: verified.result?.status === "active",
    token_id: verified.result?.id || null
  }));
  const access = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}`, {
    headers, signal: AbortSignal.timeout(20000)
  });
  const scoped = await safeJson(access);
  console.log("Workers AI account access:", JSON.stringify({
    account_suffix: account.slice(-8), http: access.status,
    same_account: scoped.result?.id === account
  }));
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
    { method: "POST", headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ prompt: "Reply OK.", max_tokens: 4 }),
      signal: AbortSignal.timeout(20000) }
  );
  const data = await safeJson(response);
  console.log("Workers AI REST probe:", JSON.stringify({
    utc: new Date().toISOString(), account_suffix: account.slice(-8),
    endpoint: "POST /accounts/{account_id}/ai/run/@cf/meta/llama-3.1-8b-instruct",
    http: response.status, cf_ray: response.headers.get("cf-ray"),
    request_id: response.headers.get("x-request-id"),
    success: data.success === true,
    errors: (Array.isArray(data.errors) ? data.errors : []).map(error => ({
      code: error.code, message: String(error.message || "").slice(0, 220)
    })),
    has_result: !!data.result
  }));
}
