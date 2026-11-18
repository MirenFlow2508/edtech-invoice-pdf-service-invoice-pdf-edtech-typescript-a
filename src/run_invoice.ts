import { invoiceForOrder, makeTransport, type EdtechOrder } from "./invoice_service.ts";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the example");
const recipient = process.env.INVOICE_RECIPIENT;
if (!recipient) throw new Error("Set INVOICE_RECIPIENT before running the example");

const order: EdtechOrder = {
  orderId: "EDU-1042",
  learnerEmail: recipient,
  learnerName: "Mina Chen",
  educatorName: "Northstar Academy",
  courses: [
    { title: "Storefront Analytics", priceCents: 8900, learnerDeadline: "2026-11-15" },
    { title: "Checkout Operations", priceCents: 6400, learnerDeadline: "2026-12-01" }
  ]
};

const result = await invoiceForOrder(order, makeTransport(apiKey));
console.log(`Invoice email sent: ${result.message_id}`);
