/**
 * Registration receipt for the 2026 International Forum on Biomedical
 * Informatics, Data Science, and AI.
 *
 * Stripe already emails its own payment receipt. This adds the one Stripe
 * cannot: a confirmation that names the event, the date, the room, and what
 * the attendee is expected to bring — the thing people actually search their
 * inbox for on the morning of November 7.
 *
 * Runs as a Cloudflare Worker. It is a webhook endpoint: Stripe calls it
 * after each completed checkout. See README.md for deployment.
 *
 * Secrets come from the Worker environment, never from this file:
 *   STRIPE_WEBHOOK_SECRET   whsec_...   verifies the call really came from Stripe
 *   RESEND_API_KEY          re_...      sends the mail
 *   FROM_EMAIL              e.g. "Forum <hello@yourdomain.org>"  (a domain you
 *                                       have verified with Resend)
 *   BCC_EMAIL               optional; copies the organizers on every receipt
 */

const EVENT = {
  name: "2026 International Forum on Biomedical Informatics, Data Science, and AI",
  date: "Saturday, November 7, 2026",
  time: "3:00 – 7:30 PM CT (doors 2:45 PM)",
  venue: "Oaks Ballroom, Sheraton Suites Market Center Dallas",
  address: "2101 N Stemmons Freeway, Dallas, TX 75207",
  contact: "leoliaugust1230@gmail.com",
};

/* Stripe signs the raw body; the signature header looks like
   `t=1699999999,v1=abc...`. We recompute the HMAC over `${t}.${body}` and
   compare in constant time. Reject anything older than five minutes so a
   captured request cannot be replayed. */
const TOLERANCE_SECONDS = 300;

async function verifyStripeSignature(rawBody, header, secret) {
  if (!header) return false;

  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    })
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`)
  );
  const expected = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return timingSafeEqual(expected, signature);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function money(amountMinor, currency) {
  if (typeof amountMinor !== "number") return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format(amountMinor / 100);
}

function receiptHtml({ name, tier, amount, reference, custom }) {
  const rows = [
    ["Event", EVENT.name],
    ["Date", EVENT.date],
    ["Time", EVENT.time],
    ["Venue", `${EVENT.venue}<br>${EVENT.address}`],
    ["Registration", tier],
    ["Amount paid", amount],
    ["Reference", reference],
  ]
    .filter(([, v]) => v)
    .map(
      ([k, v]) => `<tr>
        <td style="padding:9px 16px 9px 0;color:#6E6760;font:600 11px/1.4 -apple-system,Segoe UI,sans-serif;letter-spacing:.12em;text-transform:uppercase;vertical-align:top;white-space:nowrap">${esc(k)}</td>
        <td style="padding:9px 0;color:#1A1815;font:400 15px/1.5 -apple-system,Segoe UI,sans-serif">${v}</td>
      </tr>`
    )
    .join("");

  const extra = Object.entries(custom || {})
    .map(([k, v]) => `<tr>
        <td style="padding:9px 16px 9px 0;color:#6E6760;font:600 11px/1.4 -apple-system,Segoe UI,sans-serif;letter-spacing:.12em;text-transform:uppercase;vertical-align:top;white-space:nowrap">${esc(k)}</td>
        <td style="padding:9px 0;color:#1A1815;font:400 15px/1.5 -apple-system,Segoe UI,sans-serif">${esc(v)}</td>
      </tr>`)
    .join("");

  return `<!doctype html><html><body style="margin:0;background:#F7F5F1;padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E3DDD3;border-radius:4px">
    <tr><td style="padding:34px 34px 0">
      <p style="margin:0;color:#A6482F;font:700 11px/1.4 -apple-system,Segoe UI,sans-serif;letter-spacing:.17em;text-transform:uppercase">You're registered</p>
      <h1 style="margin:14px 0 0;color:#1A1815;font:500 27px/1.25 Georgia,serif">See you in Dallas on November 7.</h1>
      <p style="margin:16px 0 0;color:#4A453E;font:400 16px/1.6 -apple-system,Segoe UI,sans-serif">
        ${name ? esc(name) + ", your" : "Your"} registration is confirmed. Keep this email &mdash;
        showing it at the door is the fastest way through check-in.
      </p>
    </td></tr>
    <tr><td style="padding:26px 34px 0">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${rows}${extra}</table>
    </td></tr>
    <tr><td style="padding:26px 34px 34px">
      <p style="margin:0;padding-top:20px;border-top:1px solid #E3DDD3;color:#6E6760;font:400 14px/1.6 -apple-system,Segoe UI,sans-serif">
        Doors open at 2:45 PM; the reception runs to 7:30 PM. Parking at the venue is
        complimentary for attendees. Questions, or need to transfer your registration to a
        colleague? Reply to this email or write to
        <a href="mailto:${esc(EVENT.contact)}" style="color:#A6482F">${esc(EVENT.contact)}</a>.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

async function sendEmail(env, { to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: [to],
      ...(env.BCC_EMAIL ? { bcc: [env.BCC_EMAIL] } : {}),
      subject,
      html,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
  return res.json();
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    /* Read the body as text, not JSON: the signature covers the exact bytes
       Stripe sent, so re-serializing would invalidate it. */
    const rawBody = await request.text();

    const ok = await verifyStripeSignature(
      rawBody,
      request.headers.get("stripe-signature"),
      env.STRIPE_WEBHOOK_SECRET
    );
    if (!ok) return new Response("Bad signature", { status: 400 });

    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return new Response("Bad payload", { status: 400 });
    }

    if (event.type !== "checkout.session.completed") {
      return new Response("Ignored", { status: 200 });
    }

    const session = event.data?.object ?? {};
    const to =
      session.customer_details?.email || session.customer_email || null;

    /* No address to send to is not a failure Stripe should retry. */
    if (!to) return new Response("No email on session", { status: 200 });

    const custom = {};
    for (const f of session.custom_fields || []) {
      const label = f.label?.custom || f.key;
      const value =
        f.text?.value ?? f.numeric?.value ?? f.dropdown?.value ?? "";
      if (label && value) custom[label] = value;
    }

    const html = receiptHtml({
      name: session.customer_details?.name || "",
      tier: session.amount_total === 2000 ? "Student / Postdoc" : "Faculty & Industry",
      amount: money(session.amount_total, session.currency),
      reference: session.id,
      custom,
    });

    /* Answer Stripe immediately and send in the background: a slow mail API
       must not push the webhook past its timeout and trigger a retry, which
       would send the attendee a second copy. */
    ctx.waitUntil(
      sendEmail(env, {
        to,
        subject: `You're registered — ${EVENT.name.replace(/^2026 /, "")}, Nov 7`,
        html,
      }).catch((err) => console.error("receipt send failed", session.id, err))
    );

    return new Response("ok", { status: 200 });
  },
};
