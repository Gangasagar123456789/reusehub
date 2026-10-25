# ReuseHub Seller Contact Feature - Setup Checklist

## What changed

- Added a **Contact details** tab to the user dashboard.
- Sellers can save a phone number and/or an international-format WhatsApp number.
- Contact details are private by default. The seller must opt in before buyers can see them.
- Approved, available/reserved item detail pages show **Call seller** and/or **WhatsApp seller** links when the seller opted in.
- If the seller keeps contact information private, the existing **I'm interested** request flow remains available.
- The `seller_contacts` table is not publicly enumerable. A scoped database function returns only opted-in contact information tied to a specific approved listing.
- Local demo mode also persists contacts in browser local storage.

## Deploy to an existing Supabase project

1. Merge the application code into `main`.
2. Ask the Supabase project owner to open **Supabase Dashboard → SQL Editor → New query**.
3. Copy the entire contents of `supabase/migrations/20261025_seller_contacts.sql` from the merged repository into the SQL Editor and click **Run**.
4. Verify the `seller_contacts` table exists and the `get_public_seller_contact` function was created. Do not re-run the full `supabase/schema.sql` on the existing live project for this feature.
5. Ensure Vercel deploys the merged `main` branch. No new environment variables are required.

## First-time verification

1. Sign in with a seller test account.
2. Open **My dashboard → Contact details**.
3. Enter a phone number and/or WhatsApp number. For WhatsApp, include `+` and the country calling code, e.g. `+91 98765 43210`.
4. Leave **Show my contact details on my item listings** unchecked and save. Open the item as another account/private window: the number should not appear and an interest request should still be possible.
5. Return to the seller account, enable the public-contact checkbox, and save.
6. Open the same approved, available listing as a buyer. Only the channels the seller supplied should appear. Click **Call seller** on a phone-capable device and **WhatsApp seller** to verify the correct number and prefilled item message.
7. Turn off the checkbox and save again. Reload the item as a buyer; contact buttons should disappear.
8. Confirm normal signup/login, listing creation/editing, interest requests, request decisions, and listing images still work.

## Privacy / security notes

- Contact information is optional and not published unless the seller opts in.
- Only phone and WhatsApp are stored here; account email is not exposed.
- The table has Row Level Security enabled. Only the owner can read/update their contact row directly. Public lookup is scoped to a specific approved listing that is available or reserved.
- Never put a Supabase service-role key in Vercel's `VITE_*` client variables or frontend code.
