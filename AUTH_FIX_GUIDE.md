# ReuseHub authentication fix (Vercel + Supabase)

This update preserves the existing React/Vite/Supabase project and fixes the signup confirmation redirect. It also adds a **Resend confirmation email** action to the login page when Supabase is configured.

## What changed

- `src/services/store.ts`: sign-up and confirmation-resend calls now pass `emailRedirectTo: window.location.origin`. This sends the confirmation link back to the same site where signup was started.
- `src/App.tsx`: adds a resend-confirmation action on the live login page.
- `src/styles.css`: styles the new action.
- `.env.example`: documents the required Supabase redirect configuration.

## Required Supabase dashboard settings

Open the Supabase project that matches the URL in Vercel, then go to **Authentication → URL Configuration**. Set:

- **Site URL:** `https://reusehub-seven.vercel.app`
- **Redirect URLs:** add `https://reusehub-seven.vercel.app/**`
- For local Vite tests, also add `http://localhost:5173/**`

If you test on a Vercel Preview URL, that preview origin also has to be allowed. Use the stable production URL for the main test. Do not include email confirmation tokens in screenshots or messages.

## Update the existing GitHub repository from VS Code

1. Extract this ZIP into a temporary folder.
2. Open your already-cloned repository folder in VS Code.
3. Copy the contents of this update folder over the matching files in the cloned repository. Do not replace `.env.local` if it exists; keep it private and out of Git.
4. In the VS Code terminal, run:

```bash
git status
git switch -c fix/supabase-confirmation-redirect
git add src/services/store.ts src/App.tsx src/styles.css .env.example AUTH_FIX_GUIDE.md
git commit -m "Fix Supabase signup confirmation redirect"
git push -u origin fix/supabase-confirmation-redirect
```

5. Open GitHub and create a pull request from `fix/supabase-confirmation-redirect` into the repository's default/production branch. If you have direct permission and your team workflow allows it, merge the branch after checking the diff.
6. Confirm Vercel deploys the merged branch. A Preview deployment from the feature branch is also useful for checking the updated UI.

If the feature branch already exists locally, use another name or switch to that branch rather than running the creation command again.

## Test the fix

1. Open the deployed site and go to `/signup`. Register a test account with an email you can access.
2. If signup says to check email, open the newest confirmation email and click the link.
3. The link should return to `https://reusehub-seven.vercel.app` (or the origin where signup began), rather than an unrelated/localhost address.
4. If you already had an unconfirmed account, go to `/login`, enter its email in the email field, and click **Resend confirmation email**. Use the newest email link.
5. After confirming, sign in with the same email and password. Check Supabase Authentication users and ensure **Confirmed at** is populated.

## Important distinction

This code fix supplies a correct redirect target; it cannot change the Supabase dashboard allow-list or Site URL. The domain must be added to Supabase as described above. If login still says `Invalid login credentials` after the email is confirmed, verify that the account belongs to the same Supabase project configured in Vercel, then use password reset or sign up a fresh test user. Never share the password, anon/private keys, or confirmation link with anyone.
