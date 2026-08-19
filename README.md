# International Forum on Biomedical Informatics, Data Science, and AI

Event site for the 2026 forum — Saturday, November 7, 2026, Sheraton Suites
Market Center Dallas (Oaks Ballroom), a satellite of the AMIA 2026 Annual
Symposium.

## Files

- `index.html` — the entire site. Self-contained: no build step, no
  dependencies, no external requests. Open it in a browser and it works.

Everything is embedded as data URIs, because the page must also run under a
strict CSP that blocks external hosts:

- Hero photograph of downtown Dallas from Reunion Tower, by IcedCowboyCoffee,
  released under CC0 via Wikimedia Commons (~428 KB, JPEG).
- Newsreader and Manrope webfonts, SIL Open Font License (~247 KB, woff2,
  latin subset only).
- Seven photographs from the 2024 New Orleans and 2025 Atlanta forums, used
  as the rolling banner in the past-events section (~445 KB, JPEG).
- The OneSource Cloud wordmark, inlined as SVG rather than base64. The
  supplied asset is white, so it sits on a dark chip - the shape it was drawn
  for - instead of being recoloured, which the sponsorship agreement's brand
  clause would not permit.

That puts the file around 1.3 MB. It is one HTTP request and caches well.

## Design

Light-only by design: the page commits to one warm, bright palette on every
host theme rather than shipping a dark variant, so every colour is painted
explicitly. All text/background pairs meet WCAG AA. Layout is verified free of
horizontal overflow from 320px up.

## How the content is stored

All copy lives in one JSON block near the bottom of `index.html`:

    <script type="application/json" id="state"> … </script>

The page renders itself from that JSON on load. To change the agenda,
prices, speakers, or sponsors, edit that block — you do not need to touch
the markup or CSS.

## Registration and payment

Registration is handled by Stripe Payment Links against the DeepKin Stripe
account - one link per rate. The site never touches card data; each button is
a plain link out to Stripe's hosted checkout, which is why this works on a
static host with no backend and no API keys in the page.

The two link URLs live in the `state` JSON under `register.tiers[].payUrl`.
Until a URL is set, that tier's button renders as an inert "Registration opens
soon" placeholder rather than a broken link. Only `https://` URLs are accepted.

## Updating

Edit `index.html`, commit, and push. GitHub Pages redeploys in about a minute.

    git add index.html
    git commit -m "Update agenda"
    git push

## Note on the Claude artifact version

This site is also published as a Claude artifact, where it has an in-browser
"Edit page" mode that writes changes back to that copy. That editing UI is
inert here — it only activates inside the Claude viewer, so the GitHub Pages
site is a normal read-only page.

The two copies can drift. If you edit via the artifact, copy the updated
`state` JSON back into this file to keep GitHub current.
