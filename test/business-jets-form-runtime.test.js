import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../public/script.js", import.meta.url), "utf8");

function storage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); }
  };
}

test("shared script binds and submits Business Jets form without homepage catalog DOM", async () => {
  let resetCount = 0;
  const leadForm = { onsubmit: null, reset() { resetCount += 1; } };
  const leadStatus = { textContent: "" };
  const elements = new Map([
    ["#leadForm", leadForm],
    ["#leadStatus", leadStatus]
  ]);
  const document = {
    querySelector(selector) { return elements.get(selector) || null; },
    querySelectorAll() { return []; },
    addEventListener() {}
  };
  const fields = {
    need: "Business Jets / Private Aviation",
    name: "CI Browser Form",
    phone: "0900000000",
    origin: "TP.HCM",
    destination: "Đà Nẵng",
    flight_date: "2026-10-07 09:00",
    passengers: "4",
    message: "Hành lý: 2 kiện"
  };
  class FakeFormData {
    get(name) { return fields[name] || ""; }
  }
  let request = null;
  const sandbox = {
    document,
    localStorage: storage(),
    sessionStorage: storage(),
    FormData: FakeFormData,
    crypto: { randomUUID: () => "12345678-1234-1234-1234-123456789abc" },
    fetch: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ ok: true, stored: true }) };
    },
    console,
    setTimeout,
    clearTimeout
  };

  vm.runInNewContext(source, sandbox);
  assert.equal(typeof leadForm.onsubmit, "function", "Business Jets submit handler must be attached");

  let prevented = false;
  await leadForm.onsubmit({ preventDefault() { prevented = true; } });

  assert.equal(prevented, true);
  assert.equal(request?.url, "/api/leads");
  assert.equal(request?.options?.method, "POST");
  const payload = JSON.parse(request.options.body);
  assert.equal(payload.source, "business-jets");
  assert.equal(payload.name, "CI Browser Form");
  assert.equal(payload.phone, "0900000000");
  assert.equal(payload.visitor_id, "12345678-1234-1234-1234-123456789abc");
  assert.match(payload.message, /Điểm đi: TP\.HCM/);
  assert.match(payload.message, /Điểm đến: Đà Nẵng/);
  assert.match(payload.message, /Ngày\/giờ: 2026-10-07 09:00/);
  assert.match(payload.message, /Số khách: 4/);
  assert.match(payload.message, /Hành lý: 2 kiện/);
  assert.equal(leadStatus.textContent, "Đã nhận yêu cầu. Chúng tôi sẽ liên hệ sớm.");
  assert.equal(resetCount, 1);
});


test("shared script submits homepage test-drive form with the Telegram test-drive source", async () => {
  let resetCount = 0;
  const leadForm = { onsubmit: null, reset() { resetCount += 1; } };
  const leadStatus = { textContent: "" };
  const elements = new Map([
    ["#leadForm", leadForm],
    ["#leadStatus", leadStatus]
  ]);
  const document = {
    querySelector(selector) { return elements.get(selector) || null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement() { return { className: "", textContent: "", appendChild() {}, replaceChildren() {} }; },
    head: { appendChild() {} }
  };
  const fields = {
    need: "Lái thử xe",
    name: "CI WEB FORM",
    phone: "0900000000",
    interest: "Lexus RX350L",
    message: "Hẹn xem xe"
  };
  class FakeFormData {
    get(name) { return fields[name] || ""; }
  }
  let request = null;
  const sandbox = {
    document,
    localStorage: storage(),
    sessionStorage: storage(),
    FormData: FakeFormData,
    crypto: { randomUUID: () => "22345678-1234-1234-1234-123456789abc" },
    fetch: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ ok: true, stored: true }) };
    },
    console,
    setTimeout,
    clearTimeout
  };

  vm.runInNewContext(source, sandbox);
  assert.equal(typeof leadForm.onsubmit, "function");

  await leadForm.onsubmit({ preventDefault() {} });

  const payload = JSON.parse(request.options.body);
  assert.equal(request.url, "/api/leads");
  assert.equal(payload.source, "test-drive");
  assert.equal(payload.name, "CI WEB FORM");
  assert.equal(payload.phone, "0900000000");
  assert.match(payload.message, /Lái thử xe/);
  assert.match(payload.message, /Lexus RX350L/);
  assert.match(payload.message, /Hẹn xem xe/);
  assert.equal(leadStatus.textContent, "Đã nhận yêu cầu. Chúng tôi sẽ liên hệ sớm.");
  assert.equal(resetCount, 1);
});
