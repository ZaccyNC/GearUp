# GearUp

GearUp is a Trevecca outdoor rec equipment checkout prototype. Students can search for recreation gear, request a specific tagged unit when needed, cancel requests, track active checkouts, and request returns. Equipment Staff can review requests, approve or decline them, check items out, and confirm returns.

## The Problem

Shared equipment is difficult to manage when availability, requests, and returns are spread across conversations, paper, or separate spreadsheets. Students need a clear answer about what is available. Staff need a reliable queue showing what needs review, what is waiting for pickup, what is currently out, and what needs a return confirmed.

## Current Prototype

- Searchable catalog with category, availability, tracking-type, and text filters.
- Serialized inventory with optional unit selection by asset tag.
- Bulk inventory tracking for sets and quantities.
- Student request cancellation and a personal "Your gear" list.
- Student return requests that remain pending until Equipment Staff confirm the return.
- Staff queues for approval, pickup, active checkouts, and return confirmation.
- Administrator inventory adjustments for serialized units and bulk quantities.
- Persistent PostgreSQL writes through Prisma Server Actions and transactions.
- Trevecca Purple, Dark Grey, and White branding with persistent dark mode and compact layout settings.

The role selector is a presentation-only demo switch, not a login system or real authorization. Local development writes are enabled for demonstration; production mutations remain disabled until authentication and server-side authorization are implemented. Do not use the demo controls with real campus records.

## Tech Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- PostgreSQL with Prisma 7 and the `pg` adapter
- Lucide React icons

## Run Locally

Prerequisites: Node.js 20.19+ and a PostgreSQL database.

1. Install dependencies:
   ```powershell
   npm install
   ```
2. Create a private `.env` file with a development database URL:
   ```text
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
   ```
3. Apply the schema:
   ```powershell
   npx prisma db push
   ```
4. Generate Prisma Client:
   ```powershell
   npx prisma generate
   ```
5. Seed demo roles, permissions, users, and inventory:
   ```powershell
   npm run db:seed
   ```
6. Start GearUp:
   ```powershell
   npm run dev
   ```
7. Open http://localhost:3000.

The seed creates demo records for `student@trevecca.edu`, `staff@trevecca.edu`, and `admin@trevecca.edu`. These are database identities for the local presentation flow, not login credentials.

## Demo Flow

1. Stay in **Student** mode and use search or filters to find gear.
2. For serialized gear, open the ellipsis menu and choose a specific asset tag.
3. Select **Request gear**. The request is persisted and the selected unit becomes reserved.
4. Use the student **Your gear** section to cancel a request that is still awaiting approval or pickup.
5. Switch to **Equipment Staff** and review the separate approval, pickup, checked-out, and return-confirmation queues.
6. Approve or decline a request, then check approved gear out.
7. Switch back to Student and choose **Request return** on checked-out gear.
8. Switch to Equipment Staff and choose **Confirm return** only after the item has actually been received.
9. Use the settings icon for dark mode or compact layout. Preferences persist in the browser.

## Validation Commands

```powershell
npx prisma validate
npx tsc --noEmit
npm run lint
npm run build
```

## Next Steps

Replace the demo role switcher with Trevecca authentication, derive the actor identity on the server, enforce the seeded permissions for every mutation, and add stronger production-grade concurrency and reservation-conflict protection before piloting with real campus users.
