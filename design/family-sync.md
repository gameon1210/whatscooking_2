# Family sync, invites and sign-in: design (deferred)

Status: **design only, not built** (decided 17 Oct 2026: defer the backend; ship the local features first).
Applies to: What's Cooking 1.0.4 source. Today every family lives on one device (AsyncStorage).

## The problem

Two parents (and sometimes a grandparent) decide meals together, on different phones. Today:

- one phone holds the family, so the other parent can't see the plan, log a meal or answer the tiffin check;
- a lost or replaced phone loses the family (export/import JSON is the only backup);
- "Join a family" (tester item #1) has nowhere to join.

## Decisions this design proposes

| Question | Proposal | Why |
|---|---|---|
| Backend | **Supabase free tier** (Postgres, row-level security, realtime, auth) | Free, open-source, no server code needed for the first version; the app stays local-first. Firebase is the fallback if Supabase limits bite. |
| Sign-in | **None to start.** A device joins with an invite and gets an anonymous Supabase account. **Optional email code** later, only to recover a family on a new phone. | Distracted parents won't create accounts. Anonymous auth still gives every device a stable user id for security rules. |
| Joining | **Invite link + 6-character code**, made by any member, valid 7 days, single family, can be revoked. Shared over WhatsApp or the share sheet like the Cook Card. | Same hand-off pattern the app already uses; no phone numbers (1.0.2 decision). |
| Data model | **One row per record** (meal, plan, member, cart line, preference…), not one blob per family | Two parents logging dinner at the same moment both survive. A whole-family overwrite would silently drop one. |
| Conflicts | **Last writer wins per record**, using `updated_at` from the server clock; deletes are **tombstones** (`deleted_at`) kept 30 days | Simple, predictable, and right for this data: two people editing *the same meal* at once is rare, and the later correction is the one they mean. |
| Offline | Local store stays the source the UI reads; an **outbox** of changes is pushed when online; pulls apply changes since the last sync cursor | Works in a kitchen with patchy Wi-Fi; nothing waits on the network. |
| Photos | **Not synced in v1** (meal photos and home covers stay on the phone that took them) | Storage cost and privacy; the meal itself syncs, its photo shows "on Priya's phone". |
| AI key | **Never synced.** Each phone keeps its own key in secure storage. | It is a personal credential. |
| Cook | The cook does **not** join. Cook Card and Cook page stay as they are. | No accounts for household staff; replies still come back through a parent. |

## Data model (Supabase)

```sql
create table families (
  id uuid primary key,
  name text not null,
  created_at timestamptz default now()
);

-- who may read/write a family
create table family_members (
  family_id uuid references families(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'parent',      -- 'owner' | 'parent'
  device_label text,                         -- "Priya's phone"
  joined_at timestamptz default now(),
  primary key (family_id, user_id)
);

-- every synced record, one row each
create table records (
  family_id uuid references families(id) on delete cascade,
  kind text not null,          -- 'member' | 'entry' | 'plan' | 'cart' | 'preference' | 'custom_dish' | 'leftover' | 'hidden' | 'settings' | 'cook_card' | 'event'
  id text not null,            -- the app's existing uid()
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  primary key (family_id, kind, id)
);
create index on records (family_id, updated_at);

create table invites (
  code text primary key,       -- 6 chars, no 0/O/1/I
  family_id uuid references families(id) on delete cascade,
  created_by uuid references auth.users(id),
  expires_at timestamptz not null,
  revoked boolean default false,
  used_count int default 0
);
```

Row-level security: a user can select/insert/update `records` and `families` only where a `family_members` row exists for `(family_id, auth.uid())`. Invites are redeemed through one SQL function (`redeem_invite(code, device_label)`) that checks expiry and revocation and inserts the `family_members` row; the `invites` table itself is not readable by clients. `updated_at` is set by a trigger from the server clock, so a phone with the wrong time can't win every conflict.

Family `secret` (Cook Card signing) moves into a server-side column readable only by members, so any parent's phone can verify a cook's reply.

## App changes

1. `src/services/sync.ts`: the outbox, push and pull, and a realtime subscription for the open family. It is configured only when `EXPO_PUBLIC_SUPABASE_URL` and the anon key are set, so builds without them behave exactly as today.
2. The store keeps `families` as it is. A thin layer turns each `update()` diff into record upserts (compare ids per collection, as the photo-save code already does for home settings).
3. Settings → **Share this family**: create invite → WhatsApp / Share…; list devices; remove a device; revoke invites.
4. Onboarding: **Join a family** (paste code or open the link) next to "Start a new family".
5. Settings → **Back up with email** (optional): links the anonymous account to an email so a new phone can get the family back.
6. Migration: the first upload sends the whole local family as records; a second device that joins downloads them. A device with its own local family keeps it as a separate family (no silent merge).

## Privacy and compliance

- Data leaves the phone only after a parent turns sharing on; the privacy policy and Play data-safety form must be updated before release (name, meals, member diets/allergies become "collected, shared with no third party, encrypted in transit").
- India DPDP Act 2023: deleting the family deletes it server-side (cascade) and on every device on next sync; a removed device loses access immediately (RLS) and wipes its local copy on next open.
- Allergies and fasting rules are personal data; keep them in `records.data`, never in invite links or notifications.

## Risks

- **Supabase free tier pauses inactive projects** after a week without traffic. Fine for active families; needs a keep-alive or the paid tier for production.
- **Anonymous accounts are per install.** Reinstalling without the email backup loses access; the app must say so plainly on the Share screen.
- **Realtime adds battery and data use.** Subscribe only while the app is open; rely on pull-on-open otherwise.

## Test plan (when built)

- Two devices log different meals for the same dinner offline, then reconnect: both kept, the clash prompt appears on the next open (as for one device today).
- Same meal edited on both: the later server write wins; the other device shows the corrected meal.
- Delete on one device: gone on the other after sync; not resurrected by an offline edit older than the delete.
- Invite expired / revoked / reused: plain refusal message.
- Removed device: can't read after removal (RLS test with its token).
- No Supabase config: app behaves exactly as 1.0.4 (existing test suite unchanged).

## What you'd need to do

1. Create a free Supabase project (any region near India, e.g. Mumbai).
2. Paste the project URL and anon key into `app/.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) and EAS secrets.
3. Run the SQL above (it will ship as `supabase/migrations/0001_family_sync.sql` with the build).
