import test from "node:test";
import assert from "node:assert/strict";
import { invoiceForOrder, readyForInvoice, type EdtechOrder, type Transport } from "./invoice_service.ts";

const baseOrder: EdtechOrder = {
  orderId: "TEST-1",
  learnerEmail: "buyer@example.com",
  learnerName: "Test Buyer",
  educatorName: "Test School",
  courses: [{ title: "Course A", priceCents: 1000, learnerDeadline: "2026-12-10" }]
};

test("a complete deadline set permits PDF delivery and reports the email id", async () => {
  const calls: string[] = [];
  const transport: Transport = async (path) => {
    calls.push(path);
    return path.endsWith("generate") ? { pdf: "generated-pdf" } : { message_id: "msg-1" };
  };
  assert.equal(readyForInvoice(baseOrder), true);
  assert.deepEqual(await invoiceForOrder(baseOrder, transport), { message_id: "msg-1" });
  assert.deepEqual(calls, ["/v1/pdf/generate", "/v1/email/send"]);
});

test("a missing learner deadline blocks delivery", async () => {
  const incomplete = { ...baseOrder, courses: [{ title: "Course A", priceCents: 1000 }] };
  let called = false;
  const transport: Transport = async () => { called = true; return {}; };
  assert.equal(readyForInvoice(incomplete), false);
  await assert.rejects(() => invoiceForOrder(incomplete, transport), /learner deadline/);
  assert.equal(called, false);
});
