# Deployment guide (Vercel + Firebase)

## 1. Firebase (login and reports)
1. Open console.firebase.google.com and create a project.
2. **Authentication > Get started > Sign-in method:** enable **Email/Password** and **Google** (for Google, choose a support email and save).
3. **Firestore Database > Create database** (production mode, nearest region).
4. **Project settings > Your apps > Web (</>)**: register an app and copy the config.
5. Paste the values into `public/js/firebase-config.js`. Keep `window.BATON_MODE = "auto"`: on your computer it uses the local server, and on Vercel it switches to cloud mode by itself.
6. Publish the rules: either paste `firestore.rules` into Firestore > Rules, or run:
   ```
   npm i -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules
   ```
7. **Authentication > Settings > Authorized domains:** add your Vercel domain (and Firebase Hosting domain if used).

## 2. LangSmith (tracing)
1. Create an account at smith.langchain.com and create an API key.
2. You will set `LANGSMITH_TRACING=true`, `LANGSMITH_API_KEY` and `LANGSMITH_PROJECT=baton` on Vercel.
3. After a run, open the project to see one trace per agent.

## 3. Vercel (website + API)
1. Push this folder to GitHub (the `.gitignore` already keeps secrets out).
2. vercel.com > **Add New > Project** > import the repo. Framework preset: **Other**.
3. Add the environment variables: `GROQ_API_KEY`, `GROQ_MODEL=openai/gpt-oss-20b`, `FIREBASE_PROJECT_ID`, `LANGSMITH_TRACING`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`.
4. Deploy. Open `https://<your-app>.vercel.app/api/health` to confirm the API is alive.
5. Open the site, create an account and launch a crew.

## 4. Optional: Firebase Hosting for the website
If you also want the site on Firebase Hosting:
1. Set `window.BATON_API` in `public/js/firebase-config.js` to your Vercel URL.
2. Set `CORS_ORIGINS` on Vercel to your Firebase Hosting URL.
3. Edit `.firebaserc` with your project id, then run `firebase deploy --only hosting`.

## Google sign-in and login first
- The whole site now needs a login: visitors who are not signed in are sent to the login page, and after signing in they land on the main page.
- Google sign-in uses Firebase. Open the site at `http://localhost:8000` (not 127.0.0.1) when testing locally, because `localhost` is already an authorised domain in Firebase.
- For local Google sign-in add `FIREBASE_PROJECT_ID=your-project-id` to `.env` and run `pip install google-auth requests`.

## Troubleshooting
| Problem | Fix |
|---------|-----|
| Redirected to login again and again | Add the domain to Firebase authorized domains |
| 401 "session expired" | `FIREBASE_PROJECT_ID` on Vercel must match your project |
| 502 from the API | Check `GROQ_API_KEY` and model name in Vercel logs |
| CORS error on Firebase Hosting | Set `CORS_ORIGINS` and `BATON_API` as in step 4 |
| No traces | Check the three LangSmith variables and redeploy |
| Google popup says unauthorized domain | Add the domain in Firebase, Authentication, Settings, Authorized domains |
| Google sign-in does nothing locally | Check `FIREBASE_PROJECT_ID` in `.env` and that the Firebase config is filled in |
