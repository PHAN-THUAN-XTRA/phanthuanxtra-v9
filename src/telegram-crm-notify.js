const MAX_TEXT = 1800;

const clean = (value, max = MAX_TEXT) => String(value ?? "").trim().slice(0, max);

export async function notifyTelegramCrm(env, payload) {
  const token = env.TELEGRAM_CRM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CRM_CHAT_ID;
  if (!token || !chatId) return { sent: false, configured: false };

  const unknown = payload.source === "ai-unknown";
  const testDrive = payload.source === "test-drive";
  const businessJets = payload.source === "business-jets";
  const syntheticBusinessJets = businessJets && /^CI-BUSINESS-JETS-\d+$/i.test(clean(payload.name, 120));
  const syntheticTestDrive = testDrive && /^CI-WEB-FORM-\d+$/i.test(clean(payload.name, 120));
  const syntheticAiChat = /^ci-ai-chat-\d+$/i.test(clean(payload.conversationId, 100));
  const syntheticDelivery = syntheticBusinessJets || syntheticTestDrive || syntheticAiChat;
  const source = businessJets ? "BUSINESS JETS" : testDrive ? "TEST DRIVE FORM" : unknown ? "AI UNKNOWN — CẦN NGƯỜI THẬT" : payload.source === "website-lead" ? "WEBSITE LEAD" : "WEBSITE AI CHAT";
  const lines = [
    businessJets ? "✈️ LEAD — BUSINESS JETS" : testDrive ? "🚗 LEAD — TRẢI NGHIỆM LÁI THỬ" : unknown ? "⚠️ AI KHÔNG CÓ THÔNG TIN XÁC THỰC" : "🤖 LEAD — AI CHAT",
    `SOURCE: ${source}`,
    unknown && payload.unknownId ? `❓ Unknown ID: ${clean(payload.unknownId, 50)}` : null,
    payload.name ? `👤 Tên: ${clean(payload.name, 120)}` : null,
    payload.phone ? `📞 SĐT: ${clean(payload.phone, 30)}` : null,
    payload.car ? `🚘 Xe quan tâm: ${clean(payload.car, 160)}` : null,
    payload.preferredTime ? `📅 Thời gian: ${clean(payload.preferredTime, 120)}` : null,
    payload.location ? `📍 Khu vực: ${clean(payload.location, 160)}` : null,
    payload.message ? `💬 ${clean(payload.message)}` : null,
    unknown ? "🧠 Cần Phan Thuần bổ sung câu trả lời để cập nhật knowledge base." : null,
    payload.conversationId ? `🆔 Conversation: ${clean(payload.conversationId, 100)}` : null,
    "🔗 https://phanthuanxtra.com/"
  ].filter(Boolean).join("\n\n");

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: lines, disable_web_page_preview: true, disable_notification: syntheticDelivery })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      console.warn("telegram_crm_notify", String(data.description || `HTTP ${response.status}`));
      return { sent: false, configured: true };
    }
    const messageId = data.result?.message_id ?? null;
    const deliveredChatId = data.result?.chat?.id ?? null;
    let cleanupDeleted = false;
    if (syntheticDelivery && messageId != null && deliveredChatId != null) {
      try {
        const cleanup = await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id: deliveredChatId, message_id: messageId })
        });
        const cleanupData = await cleanup.json().catch(() => ({}));
        cleanupDeleted = cleanup.ok && cleanupData.ok === true;
        if (!cleanupDeleted) console.warn("telegram_crm_e2e_cleanup", String(cleanupData.description || `HTTP ${cleanup.status}`));
      } catch (error) {
        console.warn("telegram_crm_e2e_cleanup", String(error?.message || error));
      }
    }
    return { sent: true, configured: true, messageId, chatId: deliveredChatId, text: lines, synthetic: syntheticDelivery, cleanupDeleted };
  } catch (error) {
    console.warn("telegram_crm_notify", String(error?.message || error));
    return { sent: false, configured: true };
  }
}
