# GiveFree — Go-live setup (about 5 minutes)

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com → **Add project** → name it `givefree` → continue (Google Analytics optional).
2. **Authentication** → Get started → Sign-in method → enable **Google** → save.
   - Add your site domain later under Authentication → Settings → **Authorized domains**
     (for local testing, `localhost` is allowed by default).
3. **Firestore Database** → Create database → **Start in production mode** → pick a region close to your users (e.g. `asia-southeast1` Singapore).
4. **Storage** → Get started → same region.

## 2. Paste your web keys

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

## 3. Deploy the security rules

Option A — Firebase console:
- Firestore → **Rules** tab → paste `firestore.rules` → Publish.
- Storage → **Rules** tab → paste `storage.rules` → Publish.

Option B — Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase init firestore,storage   # choose the givefree project
cp firestore.rules firestore.rules   # (or point firebase.json at these files)
firebase deploy --only firestore:rules,storage
```

## 4. Deploy the website

Any static host. Easiest with the same project:

```bash
firebase init hosting   # public directory: .  (the folder with index.html)
firebase deploy --only hosting
```

Or: GitHub Pages / Netlify / Vercel / Cloudflare Pages — upload this folder as-is (no build).

## 5. Test the full flow

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
