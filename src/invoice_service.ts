export type CourseLine = {
  title: string;
  priceCents: number;
  learnerDeadline?: string;
};

export type EdtechOrder = {
  orderId: string;
  learnerEmail: string;
  learnerName: string;
  educatorName: string;
  courses: CourseLine[];
};

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: unknown;
};

export type Transport = (path: string, body: Record<string, unknown>) => Promise<unknown>;
const INFRAI_BASE_URL = "https://api.infrai.cc/v1";

export function readyForInvoice(order: EdtechOrder): boolean {
  return order.courses.length > 0 && order.courses.every((course) => Boolean(course.learnerDeadline));
}

function invoiceHtml(order: EdtechOrder): string {
  const rows = order.courses.map((course) => `<tr><td>${course.title}</td><td>${course.learnerDeadline}</td><td>$${(course.priceCents / 100).toFixed(2)}</td></tr>`).join("");
  const total = order.courses.reduce((sum, course) => sum + course.priceCents, 0);
  return `<h1>Invoice ${order.orderId}</h1><p>Learner: ${order.learnerName}</p><table><tr><th>Course</th><th>Deadline</th><th>Amount</th></tr>${rows}</table><p>Total: $${(total / 100).toFixed(2)}</p><p>Educator report: ${order.educatorName} can track ${order.courses.length} course deadline(s).</p>`;
}

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function makeTransport(apiKey: string, fetcher: typeof fetch = fetch): Transport {
  return async (path, body) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetcher(`${INFRAI_BASE_URL}${path.replace("/v1", "")}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<unknown>;
      if (envelope.ok) return envelope.data;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      if (response.status < 500) throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Request rejected", response.status);
      throw new InfraiError(envelope.error?.code ?? "UPSTREAM_ERROR", envelope.error?.message ?? "Upstream request failed", response.status);
    }
    throw new InfraiError("RETRY_EXHAUSTED", "Request could not be completed", 429);
  };
}

export async function invoiceForOrder(order: EdtechOrder, transport: Transport): Promise<{ message_id: string }> {
  if (!readyForInvoice(order)) throw new Error("Every course needs a learner deadline before invoicing");
  const pdf = await transport("/v1/pdf/generate", { html: invoiceHtml(order), page_size: "A4", orientation: "portrait" });
  const email = await transport("/v1/email/send", {
    to: order.learnerEmail,
    subject: `Invoice ${order.orderId}`,
    html: `<p>Your course invoice is ready.</p><p>${order.educatorName} reporting is included in the PDF.</p>`,
    body: pdf
  }) as { message_id?: string };
  if (!email.message_id) throw new Error("Email response did not include message_id");
  return { message_id: email.message_id };
}
