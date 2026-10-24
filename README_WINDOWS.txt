REUSEHUB - WINDOWS QUICK START

1. Install Node.js (version 20 or newer) from https://nodejs.org/
2. Extract the ReuseHub ZIP to a folder.
3. Open that folder in VS Code.
4. Open Terminal > New Terminal.
5. Run:
   npm install
   npm run dev
6. Open the local URL printed by Vite (usually http://localhost:5173).

The app starts in LOCAL DEMO MODE when .env.local is not configured. This is a single-browser prototype, not a shared online marketplace. Create a seller account/listing, then use a different local email/account to try the buyer request flow. Use the login page's demo admin option to inspect moderation UI.

To connect a real shared backend, follow README.md and run supabase/schema.sql in a NEW Supabase project's SQL Editor. Copy .env.example to .env.local and fill in the Supabase Project URL and public client key. Never place a service-role secret in the frontend.
