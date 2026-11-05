/**
 * Opt-in outbound ByteChef webhook emitter. Not imported by any production route.
 * The ByteChef "Validate and Respond" trigger uses the X-Csrf-Token header.
 */
const EVENTS = new Set(["vehicle.review_requested", "vehicle.publication_verified"]);
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export async function emitVehicleEvent({
  enabled = false,
  webhookUrl,
  csrfToken,
  event,
  vehicleId,
  correlationId,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!enabled) return { status: "disabled" };
  if (!EVENTS.has(event)) throw new TypeError("Event is not allowlisted");
  if (typeof vehicleId !== "string" || !ID_RE.test(vehicleId)) throw new TypeError("Invalid vehicleId");
  if (typeof correlationId !== "string" || !ID_RE.test(correlationId)) throw new TypeError("Invalid correlationId");
  if (typeof csrfToken !== "string" || csrfToken.length < 24) throw new TypeError("Missing webhook credential");
  let target;
  try { target = new URL(webhookUrl); } catch { throw new TypeError("Invalid webhook URL"); }
  if (target.protocol !== "https:" || target.username || target.password || target.hash) {
    throw new TypeError("Webhook URL must be HTTPS without embedded credentials");
  }
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl is required");
  const response = await fetchImpl(target.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Csrf-Token": csrfToken,
    },
    body: JSON.stringify({
      schema: "phanthuanxtra.bytechef.event.v1",
      event,
      vehicleId,
      correlationId,
    }),
    redirect: "error",
    signal: AbortSignal.timeout(5000),
  });
  // The HTTP result is the webhook receipt, never a downstream workflow assertion.
  return { status: response.ok ? "accepted" : "failed", httpStatus: response.status };
}
