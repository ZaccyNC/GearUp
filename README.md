# GearUp

A prototype for organizing Trevecca's shared recreation equipment. Students can find and request gear, while Equipment Staff manage the checkout queue, pickups, and returns. The initial focus is intramural equipment at Moore Fitness Center, with a data model organized by campus locations and categories for future expansion.

## The Problem

Equipment tracked through informal sign-outs or scattered spreadsheets can be difficult to locate, double-booked, or returned without a clear condition record. GearUp models an inventory catalog separately from physical units so serialized equipment can be tracked by asset tag and bulk supplies can be counted.

## Current Prototype

- Searchable equipment catalog with category filters and availability indicators.
- Demo role switcher for the student catalog, staff checkout queue, and administrator inventory controls.
- Prisma data model and repeatable demo seed data for roles, permissions, users, and intramural inventory.

The role switcher is for presentation only: it is not a login system or real authorization. In local development, requests, approval, checkout, returns, and inventory adjustments are written to PostgreSQL. Mutations are disabled in production until authentication and server-side authorization are implemented. If the database is unavailable or has no active items, the catalog displays read-only sample inventory.

See [PRESENTATION.md](PRESENTATION.md) for a timed five-minute demo script, judging-category coverage, and likely judge questions.

## Tech Stack

- Next.js 16, React 19, and TypeScript
- Tailwind CSS
- PostgreSQL with Prisma 7 and the `pg` adapter

## Run Locally

Prerequisites: Node.js 20.19+ and a PostgreSQL database.

1. Install dependencies with `npm install`.
2. Create a `.env` file containing `DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"`.
3. Apply the Prisma schema with `npx prisma db push`.
4. Generate the Prisma client with `npx prisma generate`.
5. Load demo roles, users, permissions, and inventory with `npm run db:seed`.
6. Start the local demo with `npm run dev` and open `http://localhost:3000`.

Demo account records are `student@trevecca.edu`, `staff@trevecca.edu`, and `admin@trevecca.edu`. They are not login credentials; authentication has not been connected. Demo reservations are created for the seeded student account. Local-demo reservations and inventory adjustments persist in the database; do not use the demo controls with real campus records.

## Next Steps

Enforce role permissions using authenticated server-side identity, add campus authentication before using real student data, and improve reservation conflict handling. The current role selector and mutation actions are only for a trusted local development demo.
