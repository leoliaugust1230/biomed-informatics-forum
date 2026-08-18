# International Forum on Biomedical Informatics, Data Science, and AI

Event site for the 2026 forum — Saturday, November 7, 2026, Sheraton Suites
Market Center Dallas (Oaks Ballroom), a satellite of the AMIA 2026 Annual
Symposium.

## Files

- `index.html` — the entire site. Self-contained: no build step, no
  dependencies, no external assets. Open it in a browser and it works.

## How the content is stored

All copy lives in one JSON block near the bottom of `index.html`:

    <script type="application/json" id="state"> … </script>

The page renders itself from that JSON on load. To change the agenda,
prices, speakers, or sponsors, edit that block — you do not need to touch
the markup or CSS.

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
