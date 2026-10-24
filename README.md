# ReuseHub

> **Authentication fix:** See [`AUTH_FIX_GUIDE.md`](./AUTH_FIX_GUIDE.md) for the signup confirmation redirect fix and required Supabase URL settings.


**Tagline:** Give it another chapter.

ReuseHub is a student-focused platform for donating educational resources for free or reselling them at an affordable, seller-chosen price. It includes searchable listings, listing photos, MRP-based savings displays, buyer interest requests, reservation/completion workflows, reports, and an administrator moderation area.

## Important modes

### Local demo mode (works without Supabase credentials)

If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are absent, the app uses a local browser demo backed by `localStorage`.

- Browse with six clearly marked sample/example listings.
- Create student listings, edit/remove them, send requests, reserve items, and test handover status flows by signing into different local demo identities (use different email addresses to represent different students).
- Use **Open demo admin view** on the login page to inspect the moderation dashboard.
- The local demo is only for testing UI and workflows. Data is stored in the current browser and is not shared with other people. Demo authentication is not secure and must not be used for real users.
- Seeded sample items are labelled as examples and are excluded from real impact metrics. They are not live offers and cannot receive actionable requests.

### Connected Supabase mode

When both Supabase environment values are set, the app uses Supabase Authentication, PostgreSQL, Storage, and RLS policies for real persistence. You must configure the Supabase project as described below. The presence of a frontend is not proof the backend is configured; test it before inviting real users.

## Stack

- React + Vite + TypeScript
- React Router
- Lucide React icons
- Supabase Auth, Postgres, Storage, and Row Level Security
- Responsive custom CSS design system

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL shown by Vite. On Windows PowerShell, copy the file with:

```powershell
Copy-Item .env.example .env.local
```

Leave both Supabase fields blank to start in local demo mode. No account or backend project is required for that mode.

To check the production build:

```bash
npm run build
npm run preview
```

## Connect a Supabase project

1. Create a Supabase project in your own Supabase account.
2. Open **SQL Editor** for the project.
3. Open `supabase/schema.sql` from this repository, review it, and run it in the new project. This creates the app tables, indexes, profile trigger, request workflow functions, storage bucket, and RLS policies.
4. In project settings, obtain the Project URL and the public client key (the legacy anon key or the publishable key accepted by your Supabase project).
5. Add them to `.env.local`:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_CLIENT_KEY
   ```

6. Restart the Vite server after changing environment variables.
7. In Supabase Authentication settings, configure your permitted email providers and the local/deployed Site URL and redirect URLs. For an academic demo, use the exact local development URL and deployed site URL.
8. Create a regular user using the app signup screen. The database trigger creates the corresponding profile.
9. Verify that the storage bucket named `listing-images` exists. The schema script creates it and applies file policies.
10. Test two different user accounts through the full listing and request workflow before using real student data.

### Create the administrator account

Do not expose an admin secret or allow users to assign themselves the admin role. First register the intended administrator through the app. Then, from the Supabase SQL Editor as the project owner, run a targeted update using that account's UUID from Supabase Authentication:

```sql
update public.profiles
set role = 'admin', updated_at = now()
where id = 'REPLACE_WITH_AUTH_USER_UUID';
```

Never give the SQL Editor or service-role credentials to the browser. The admin role update above is an owner/admin setup task, not an action available from the public interface.

## Features

- Home page with item discovery and impact counters based on recorded activity.
- Browse with search, categories, listing type, condition, price limit, and sorting.
- Item details with condition, seller display name, donation/resale label, and seller-declared MRP savings.
- Create and edit donation or resale listings with image upload.
- User dashboard for own listings, incoming requests, and requests sent.
- Request workflow with pending, accepted, declined, cancelled, and completed states.
- Reservation on seller acceptance, with competing pending requests resolved consistently in the database workflow.
- Listing reports and admin moderation.
- About and safety-guideline pages.
- Responsive layout, loading/empty/error states, and notices.

## How pricing works

Donations are set to ₹0 and do not show an artificial discount. Resale savings display only if an entered MRP is valid and greater than the asking price:

- Savings = declared MRP - asking price
- Savings percentage = (savings / declared MRP) × 100

MRP and condition are seller-provided and are not independently verified by ReuseHub. Do not describe the displayed savings as a verified market valuation.

## User and safety boundaries

- Public listings display a seller name snapshot, not private profile details.
- Users should only edit their own listings.
- Private interest requests should only be visible to the buyer, seller, or an authorized admin.
- Status transitions that reserve or complete a listing use database functions in Supabase mode.
- The local demo is not a secure multi-user system. Do not use it for real account data or real transactions.
- No payments or delivery are processed. Participants arrange these directly and should use a public handover location.
- Only permitted educational materials should be listed. Counterfeit items, pirated/unauthorized copies, and unsafe or unrelated goods should be removed.

## Deployment

1. Push the repository to GitHub.
2. Create a Vercel or Cloudflare Pages project connected to the repository.
3. Set the build command to `npm run build` and the output directory to `dist`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build environment variables for a connected deployment.
5. Add the deployed URL to Supabase Authentication's Site URL / redirect allow-list.
6. Deploy and test signup, login, listing creation, photo upload, search, interest request, reservation, completion, reports, and admin access from separate accounts.

If deploying without Supabase configuration, the website remains a browser-local demo. It does not become a shared marketplace merely because it is deployed publicly.

## Notes and limitations

- The application does not verify item authenticity, MRP, or condition.
- It does not provide checkout, payment escrow, delivery, ratings, real-time chat, or identity verification.
- `schema.sql` is intended for a new project; review it before applying to an existing production database.
- Network access may be required to display the hosted photo examples and web font. Each example listing has a fallback image path.
- Run the build and test connected RLS policies before any public rollout.
