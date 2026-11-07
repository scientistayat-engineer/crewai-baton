// Paste your Firebase web app config here (Firebase console > Project settings > Your apps).
// These values are public identifiers, not secrets. Security comes from Firebase Auth and Firestore rules.
window.BATON_FIREBASE = {
  apiKey: "AIzaSyC4jICYYpKzs2ExllHDbKScBj9fF376od0",
  authDomain: "baton-crewai.firebaseapp.com",
  projectId: "baton-crewai",
  appId: "1:672370406333:web:f8b0df937c5d65b81718d4"
};
// "auto": real CrewAI on your computer (localhost), Firebase + Vercel when deployed.
// You can also force "local" or "cloud".
window.BATON_MODE = "auto";
// Leave empty when the site and API are both on Vercel.
// If the site is on Firebase Hosting, put your Vercel URL here, e.g. "https://baton.vercel.app"
window.BATON_API = "";
