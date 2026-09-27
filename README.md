# Trevecca Gear Desk

A prototype for organizing Trevecca's shared recreation equipment. Students can find and request gear, while desk staff can manage checkouts and returns. The initial focus is intramural equipment at Moore Fitness Center, with a data model organized by campus locations and categories for future expansion.

## The Problem

Equipment tracked through informal sign-outs or scattered spreadsheets can be difficult to locate, double-booked, or returned without a clear condition record. Gear Desk models an inventory catalog separately from physical units so serialized equipment can be tracked by asset tag and bulk supplies can be counted.

## Current Prototype

- Searchable equipment catalog with category filters and availability indicators.
- Demo role switcher for the student catalog, staff checkout queue, and administrator inventory controls.
- Prisma data model and repeatable demo seed data for roles, permissions, users, and intramural inventory.

The role switcher and checkout actions are for presentation only: interactions stay in browser memory, and there is no real login or server-side authorization. The catalog reads from PostgreSQL when configured and otherwise displays clearly labeled sample inventory.

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
5. Load demo roles, users, and inventory with `npm run db:seed`.
6. Start the app with `npm run dev` and open `http://localhost:3000`.

Demo account records are `student@trevecca.edu`, `staff@trevecca.edu`, and `admin@trevecca.edu`. They are not login credentials; authentication has not been connected. Database inventory is read-only in this prototype, and demo actions are not persisted.

## Next Steps

Persist reservation and checkout actions, enforce role permissions on the server, and add campus authentication before using real student data. Reservation conflict handling and a real administrator inventory workflow are also future work.
