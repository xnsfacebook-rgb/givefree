# GiveFree 🎁 — Give & Ask for Free Items

A simple, responsive, mobile-first website where people **give away items they no longer need**
and **ask for items they need** — 100% free, organised **by country**.

Default language: **English**. No build step: plain HTML + CSS + JavaScript, Firebase on the back end.

## Features

| Feature | How it works |
|---|---|
| **Two sides** | Tabs: **Giving away** 🎁 / **Needed** 🙏 / All |
| **Google sign-in** | Firebase Auth, Google provider only. No passwords stored. |
| **Personal profile** | First sign-in asks for display name, **country**, city, optional phone. Shown on your items. |
| **By country** | Every post has a country + city. Filter the feed by country, category, status, or search. |
| **2 posts / week** | Rolling 7-day limit per account (Give + Need combined). The app counts your posts from the last 7 days and blocks the 3rd, showing `X/2 this week`. |
| **Confirm given** | The owner taps **“Mark as given”** (Give posts) or **“Mark as received”** (Need posts). The item leaves the Available list and shows a ✓ badge. |
| **Photos** | Optional photo upload (Firebase Storage, ≤ 5 MB, images only) or an image URL. |
| **Free only** | No prices, no payments anywhere in the UI or the data model. |

## Data model (Firestore)

- `users/{uid}` — `displayName, email, photoURL, country, city, phone, createdAt, updatedAt`
- `items/{id}` — `type: give|need, title, category, condition, description, country, city, imageUrl, ownerId, ownerName, ownerPhone, status: available|given|received|closed, createdAt, updatedAt, givenAt`

Security rules: `firestore.rules` + `storage.rules` (owner-only writes, public reads).

## Files

- `index.html` — the whole UI (English)
- `styles.css` — mobile-first responsive styles
- `app.js` — Firebase Auth / Firestore / Storage logic, weekly limit, filters
- `firebase-config.js` — **paste your Firebase web keys here**
- `firestore.rules`, `storage.rules` — deploy to Firebase
- `SETUP.md` — 5-minute go-live guide

## Preview without Firebase

Open `index.html` with `?demo=1` (e.g. via any static host, or `python3 -m http.server`)
to see the design with 6 sample items. Demo posts are local-only and not saved.

## Deploy

Any static host works: **Firebase Hosting** (recommended, same project),
GitHub Pages, Netlify, Vercel, or Cloudflare Pages. Then add your site's domain
to Firebase Auth → Authorized domains.

## Roadmap (v2, if you want it)

- In-app chat between giver and requester (instead of showing a phone number)
- Hard server-side weekly-limit enforcement via Cloud Function
- Report / moderation queue + admin role
- “Reserve” state between Available and Given
- Multi-language switch (Korean / Vietnamese)
