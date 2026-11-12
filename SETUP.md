# GiveFree — Go-live setup (about 5 minutes)

## Is Firebase free? Yes — with one catch

**Spark plan = free, no card needed.** It covers everything GiveFree needs at the
start: Google sign-in (50,000 users/month free), Firestore (1 GiB stored,
50,000 reads + 20,000 writes per day), Hosting (10 GB). If usage stays under
those quotas, the bill is $0 — and if a quota runs out, Firebase just pauses
that service instead of charging you.

**Catch (since 3 Feb 2026): Cloud Storage now requires the Blaze plan**
(pay-as-you-go, card required). On Spark, photo *uploads* fail. The app handles
that: a post still goes through without the photo, and you can paste an image
link instead. If you later want uploads, upgrade to Blaze (no monthly fee —
you keep the same free quotas and only pay for usage above them; set a budget
alert first). This is the only paid piece; Auth + Firestore stay free on Spark.

## 1. Create the Firebase project

1. Open **https://console.firebase.google.com** in your browser (not
   firebase.google.com — that is the marketing site) and sign in with your
   Google account.
2. On the console home you will see your projects as cards. Click **Add project**
   (or **Create a project** — the big tile with a `+`). If you already have a
   project open, click the project name at the top-left → **Add project**.
3. Project name: `givefree` → **Continue** → turn **Google Analytics OFF**
   (not needed) → **Create project** → wait ~30 seconds → **Continue**.
4. You are now inside the project. The left sidebar has a **Build** section —
   that is where Authentication, Firestore Database and Storage live.

## 2. Enable the services (left sidebar → Build)

1. **Authentication** → **Get started** → tab **Sign-in method** → click
   **Google** → turn **Enable** ON → pick your email as **Project support email**
   → **Save**.
   - Add your site domain later under Authentication → Settings →
     **Authorized domains** (for local testing, `localhost` is allowed by default).
2. **Firestore Database** → **Create database** → choose **Standard edition** →
   **Next** → **Start in production mode** → location: pick
   `asia-southeast1` (Singapore, closest to Vietnam/Korea) → **Enable**.
3. **Storage** → **Get started** → same region. ⚠️ On the free Spark plan this
   page may redirect you to an upgrade page — that is the Feb 2026 change above.
   **Skip it:** the site works without Storage (image links still work, and a
   failed upload never blocks a post). Only do this step if you upgrade to Blaze.

## 3. Paste your web keys

Project settings (⚙️) → **Your apps** → Web app `</>` → register app `givefree-web` → copy the `firebaseConfig` object.

Open `firebase-config.js` and replace the `YOUR_...` values with yours:

```js
window.GIVEFREE_FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "givefree-xxx.firebaseapp.com",
  projectId: "givefree-xxx",
  storageBucket: "givefree-xxx.appspot.com",
  messagingSenderId: "123...",
  appId: "1:123...:web:abc..."
};
```

These are public web keys — safe to ship in client code. Real security is in the rules below.

## 4. Deploy the security rules

Option A — Firebase console:
- Firestore → **Rules** tab → paste `firestore.rules` → Publish.
- Storage → **Rules** tab → paste `storage.rules` → Publish. (Skip if you
  skipped Storage on Spark — this file is only needed after a Blaze upgrade.)

Option B — Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase init firestore,storage   # choose the givefree project
cp firestore.rules firestore.rules   # (or point firebase.json at these files)
firebase deploy --only firestore:rules,storage
```

> **Composite index (required):** the weekly-limit count queries
> `items` by `ownerId` + `createdAt`, which needs a composite index
> (`firestore.indexes.json`). Without it, posting saves the item but shows
> "Could not post: The query requires an index". Create it with
> `firebase deploy --only firestore:indexes`, or open the link shown in the
> error — the console pre-fills the index, just click Create.

## 5. Deploy the website

Any static host. Easiest with the same project:

```bash
firebase init hosting   # public directory: .  (the folder with index.html)
firebase deploy --only hosting
```

Or: GitHub Pages / Netlify / Vercel / Cloudflare Pages — upload this folder as-is (no build).

## 6. Test the full flow

1. Open the site → **Sign in with Google** → complete profile (name, country, city).
2. Post a **Give** item, then a **Need** item → counter shows `2/2 this week`.
3. Try a 3rd post → it must be blocked with the weekly-limit message.
4. Open the item → **Mark as given** → it leaves the Available list.
5. Filter by country → only that country's items show.

## Notes & limits (be honest)

- **Weekly limit is enforced in the app** (`app.js` counts your posts from the last 7 days).
  A determined user could bypass any client-side check, so for hard enforcement add a
  small Cloud Function that counts on write and rejects the 3rd post. Rules alone
  cannot count documents. This is listed as a v2 item in the README.
- **No in-app chat in v1.** Contact = the phone number the owner chose to share,
  visible only after sign-in. Add chat in v2 if you want it.
- **Free only.** There is no payment code anywhere; if someone asks for money, that is
  against the house rules — report the item (v2: report button + moderation queue).
