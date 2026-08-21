# Registration receipt email

Sends a confirmation email after each completed Stripe checkout.

## What this is for

Stripe already emails its own payment receipt automatically, and that receipt
is the legal record of the transaction. **This does not replace it.** It adds
the thing Stripe's receipt cannot contain: the date, the room, the address, the
door time, and what to bring — the email an attendee actually searches for on
the morning of November 7.

If you only want proof of payment, you already have it and can skip this
entirely.

## Why it isn't part of the site

`index.html` is a static page. Sending email requires a secret API key, and any
key shipped to the browser is public the moment the page loads. So this runs
server-side, as a webhook Stripe calls after each payment. GitHub Pages cannot
host it — it serves files, it doesn't run code.

`worker.js` is written for **Cloudflare Workers** (free tier is far more than
this needs). The logic ports to Vercel or Netlify functions with only the
handler signature changed.

## Setup

**1. An email provider.** The code uses [Resend](https://resend.com). Create an
account, verify a domain you control, and take an API key. You cannot send
"from" gmail.com — providers reject it. If you have no domain, use Stripe's
built-in receipt instead and skip this.

**2. Deploy the worker.**

```bash
npm install -g wrangler
```

```bash
cd "AMIA Chinese Reception/2026 Dallas/receipt-function" && wrangler deploy worker.js --name forum-receipt --compatibility-date 2026-01-01
```

**3. Set the secrets.** Never put these in the file — `wrangler secret` stores
them encrypted, outside the repo.

```bash
wrangler secret put RESEND_API_KEY --name forum-receipt
```

```bash
wrangler secret put FROM_EMAIL --name forum-receipt
```

`FROM_EMAIL` looks like `Forum <hello@yourdomain.org>`. Optionally add
`BCC_EMAIL` to copy yourself on every receipt — a cheap running attendee list.

**4. Point Stripe at it.** In the Stripe Dashboard: **Developers → Webhooks →
Add endpoint**, URL `https://forum-receipt.<your-subdomain>.workers.dev`, event
`checkout.session.completed`. Stripe shows a signing secret (`whsec_…`) once —
that goes in last:

```bash
wrangler secret put STRIPE_WEBHOOK_SECRET --name forum-receipt
```

**5. Test before it matters.**

```bash
stripe trigger checkout.session.completed
```

Then run a real $20 payment through the live link and refund yourself.

## How it protects itself

- **Signature verification.** Every request is checked against
  `STRIPE_WEBHOOK_SECRET` before anything is read. Without this the endpoint is
  a public "email anyone" button.
- **Replay window.** Requests older than five minutes are rejected, so a
  captured request cannot be resent later.
- **Constant-time comparison**, so the signature can't be guessed by timing.
- **Returns 200 quickly** and sends in the background. A slow mail API would
  otherwise push past Stripe's webhook timeout and trigger a retry — which
  sends the attendee a second copy.
- **Missing email address returns 200, not an error.** Stripe retries failures;
  there is nothing to retry here, and a retry loop would be noise.

## Changing the email

Event details are the `EVENT` object at the top of `worker.js`. The layout is
`receiptHtml()` — plain table markup with inline styles, which is what email
clients actually render. It mirrors the site's palette (`#A6482F` terracotta,
`#F7F5F1` ground).

The tier label is inferred from the amount: `2000` minor units is the $20 rate,
anything else is treated as Faculty & Industry. If the prices change, update
that line.
