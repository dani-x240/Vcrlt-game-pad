# BAOBAB

A living learning ecosystem for Ugandan students — Primary through Secondary.
This is the working frontend prototype: student journey (tree, Babsi, practice,
Boss Battles), account-type entry (Student / Parent / School / Ministry), and the
supporting pieces discussed (leaderboard, learning-path selection, installable PWA,
offline indicator, read-aloud, notification permission).

**What this is not yet**: a real backend. There's no live database, no real
authentication, and Babsi's replies are scripted for the demo rather than calling
an actual AI model. Wiring those up is the next real phase of work, not something
this prototype fakes being.

## Run it locally

```bash
npm install
npm run dev
```

## Push to GitHub

```bash
git init
git add .
git commit -m "BAOBAB prototype"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## Deploy

**Vercel** (recommended, zero config): connect the GitHub repo at
vercel.com/new — it auto-detects Vite and deploys on every push. No workflow
file needed; Vercel's own GitHub integration handles it.

**GitHub Pages instead**: use `.github/workflows/deploy.yml` in this repo,
which builds and publishes `dist/` on every push to `main`.

## Next real steps, in rough priority order

1. Backend: auth, database (student/parent/school/teacher accounts, the
   mutual-consent connection model discussed), and real progress persistence.
2. Wire Babsi to an actual model call, grounded in the curriculum library
   (RAG) rather than scripted responses.
3. Build out the Parent and School dashboards (currently placeholders in
   the app — `parentPlaceholder` / `schoolPlaceholder` screens in App.jsx).
4. SMS/USSD fallback and local-language support.
5. Child-safety review before any chat/social feature ships.
