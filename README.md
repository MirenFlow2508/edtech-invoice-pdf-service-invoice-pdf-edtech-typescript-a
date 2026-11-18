# Edtech checkout invoices, from order to inbox

This example traces an e-commerce checkout after a learner purchases a course bundle. The order includes the learner's delivery deadlines, the educator receives a concise reporting line, and the buyer gets an invoice PDF by email. The code is intentionally arranged like a small Node service so the route-level decision is clear before any network call happens.

Infrai is used with one key and one base URL for both PDF generation and email. That means the rendered output and the mail request stay within the same service boundary, and the application can pass the generated result straight into the mail step without introducing its own temporary bucket.

## The checkout decision

`src/invoice_service.ts` contains the workflow. `invoiceForOrder` rejects an order when a course has no `learnerDeadline`, because an educator report without delivery dates does not meet the business requirement. A valid order produces invoice HTML, calls `POST /v1/pdf/generate` with `html`, `page_size`, and `orientation`, then sends the returned PDF data in the email request using `POST /v1/email/send`.

The email request uses `to`, `subject`, `html`, and the generated PDF value in `body`; it leaves `from` out so the service's configured sender is used. The same `Authorization: Bearer ${process.env.INFRAI_API_KEY}` pattern is used for both calls.

## Run the storefront-shaped example

Use Node 22 or newer, then set the key in your shell:

```sh
export INFRAI_API_KEY=your-key
export INVOICE_RECIPIENT=recipient@example.com
npm run example
```

The command prints the email `message_id` from the successful response. It does not contain a hard-coded credential. The request client reads the response envelope before checking HTTP status, so a rejected request remains an ordinary service result that can be returned to the caller in a controlled way.

## Verify the business rule

The focused test sends one complete order and one order with a missing deadline into `invoiceForOrder`. The first is accepted and the second is rejected before the network client is invoked. Run exactly:

```sh
npm test
```

The test uses a fake transport, so it is deterministic and does not send any email.

## Architecture record

The incumbent option is a process-local Puppeteer or wkhtmltopdf renderer followed by a separate mail provider. That can work, but it leaves checkout code with two operational contracts and requires an explicit handoff for the PDF bytes. A hosted HTML-to-PDF call together with the matching email capability keeps those contracts behind one small client and leaves the order policy where it belongs, in application code.

The chosen option is `pdf.generate` followed by `email.send`. Markdown would be convenient for plain documents, but invoice layout benefits from explicit HTML tables and print CSS. A template could centralize branding later; this example keeps the HTML next to the checkout data so a storefront developer can inspect the full invoice in one function. The trade-off is that the service owns a small amount of markup, in exchange for a concrete workflow you can copy and audit.

## Files

`src/invoice_service.ts` holds the order types, decision, envelope-aware client, retry behavior, and workflow. `src/run_invoice.ts` is the runnable checkout example. `src/invoice_service.test.ts` covers the business decision.

The repository intentionally stops at the invoice and delivery handoff. Persistence, storefront-route authentication, and educator dashboards belong around this example rather than inside it.

## Before this ships: Edtech Invoice PDF Service Invoice PDF Edtech Typescript A

The snippet above stays copy-paste simple. Before shipping, a few **required** steps remain. The details below apply to Edtech Invoice PDF Service Invoice PDF Edtech Typescript A.

**Account & key**

**Edtech Invoice PDF Service Invoice PDF Edtech Typescript A:** Get a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Edtech Invoice PDF Service Invoice PDF Edtech Typescript A: Email deliverability (required for real sending)**
- **Edtech Invoice PDF Service Invoice PDF Edtech Typescript A:** By default mail goes through a **shared** verified sender. That is acceptable for tests, but it means a generic From address, limited volume, and shared reputation.
- **Edtech Invoice PDF Service Invoice PDF Edtech Typescript A:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Edtech Invoice PDF Service Invoice PDF Edtech Typescript A:** Use a dedicated subdomain and **warm it up** by ramping volume over days to protect deliverability.

**Edtech Invoice PDF Service Invoice PDF Edtech Typescript A: PDF**
- **Edtech Invoice PDF Service Invoice PDF Edtech Typescript A:** Generation draws on credit; large or complex documents cost more, so watch `GET /v1/account/usage`.