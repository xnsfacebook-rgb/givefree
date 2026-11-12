/* GiveFree — Firebase configuration.
 * HOW TO FILL THIS IN (5 minutes, see SETUP.md):
 *  1. Go to https://console.firebase.google.com → Create project → enable
 *     Authentication (Google provider), Firestore Database, Storage.
 *  2. Project settings → Your apps → Web app → copy the firebaseConfig object.
 *  3. Paste the values below, replacing the "YOUR_..." placeholders.
 *  4. Deploy firestore.rules + storage.rules (see SETUP.md).
 * Do NOT commit real keys to a public repo you don't own — these web keys are
 * safe to ship in client code (security lives in Firestore/Storage rules),
 * but keep the project itself under your Google account.
 */
window.GIVEFREE_FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
