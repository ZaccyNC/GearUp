# GearUp: Five-Minute Demo

## One-Sentence Pitch

GearUp is a campus equipment checkout tool that helps Trevecca students find and request recreation gear while giving Equipment Staff a clear, persistent workflow for approvals, pickups, active checkouts, and returns.

## Run of Show

### 0:00-0:40 | Problem

"Borrowing campus equipment should be simple, but students and staff can easily lose track of what is available, who requested it, what is waiting for pickup, and whether an item was actually returned. When those details live in conversations, paper, or separate spreadsheets, the student experience and the staff record can disagree. GearUp brings that workflow into one focused tool for Trevecca recreation equipment."

Present this as a problem hypothesis unless you have confirmed the current process with Intramurals or Recreation staff. If you have confirmation, add one specific example.

### 0:40-1:10 | Who It Is For and Why It Matters

"The primary users are Trevecca students borrowing equipment and the Equipment Staff responsible for approving, handing out, and receiving it. Students get a clear catalog and a personal list of their requests and checkouts. Staff get separate queues for decisions, pickups, active loans, and return confirmation. That reduces ambiguity and makes accountability visible without adding a complicated process for the student."

### 1:10-1:35 | What Is Different

"GearUp does not treat every item as the same. A basketball can be tracked as an individual tagged unit, while a set of cones can be managed as bulk quantity. Students can choose a specific asset tag when that matters. The design also separates a student saying ‘I returned this’ from staff confirming that the return was received."

### 1:35-3:55 | Live Demo

1. Start in **Student** mode. Search the catalog and show the category, availability, and item-type filters.
2. Open the ellipsis menu on the basketball and choose a specific asset tag.
3. Select **Request gear**. Explain that the request is saved to PostgreSQL and the unit becomes reserved.
4. Open **Your gear** and show the request. Use the ellipsis menu to cancel it, demonstrating that the unit becomes available again.
5. Request the basketball again, then switch to **Equipment Staff**.
6. Show the separate queues: approval, pickup, currently checked out, and return confirmation. Approve the request, then check it out.
7. Switch back to Student and choose **Request return**. Explain that the student cannot make the item available immediately; the return waits for staff confirmation.
8. Switch to Equipment Staff and choose **Confirm return**. Show the unit becoming available again.
9. Optionally open the settings icon to show Trevecca styling, dark mode, and compact layout.

The role selector is a presentation-only switch, not campus sign-in or security. The local demo writes to PostgreSQL, but production mutations are disabled until authentication and server authorization exist.

### 3:55-4:35 | Technical Overview

"The app uses Next.js, React, and TypeScript with PostgreSQL and Prisma 7. The server loads a minimal inventory DTO and active reservation data. Server Actions validate each demo operation and use transactions when reserving a unit, approving or declining a request, checking gear out, adjusting inventory, or confirming a return. Serialized units and bulk inventory use different availability rules."

### 4:35-5:00 | Execution Roadmap and Close

"The next milestone is replacing the demo role switcher with Trevecca authentication and deriving permissions from the authenticated user on the server. Then we would add stronger concurrency protection, validate the workflow with Recreation staff, and pilot it with a small real inventory set. GearUp makes shared campus equipment easier to find, borrow, and account for."

## Judging Categories

- **Problem:** Students and Equipment Staff need one trustworthy workflow for availability, requests, loans, and returns.
- **Innovation:** GearUp combines tagged-unit tracking, bulk quantity tracking, student self-service, staff review queues, and a separate return-confirmation step.
- **Execution:** The MVP is functional and database-backed. Requests, cancellation, approval, decline, checkout, student return requests, staff return confirmation, and inventory adjustments persist locally.
- **Presentation:** The demo tells one complete story: find a unit, request it, cancel or approve it, check it out, request a return, and confirm the return.

## Likely Questions

**What is the hardest technical part so far?**

"Keeping the reservation and physical unit state synchronized. A tagged unit must not be reserved twice, and a student return request must not make an item available until Equipment Staff confirm it. The action layer uses transactional updates for those transitions."

**Can students cancel a request?**

"Yes, while it is still waiting for approval or pickup. Cancelling releases the reserved tagged unit. Once the item is checked out, the student uses Request return instead."

**Why does staff confirm the return?**

"A student can report that gear was returned, but only staff can verify that the item was physically received and its condition is acceptable. That prevents the system from claiming an item is available before someone has checked it in."

**Is it connected to Trevecca login?**

"Not yet. The role selector is only a trusted local demo control. Before real use, the app needs Trevecca authentication and server-side permission checks for every mutation."

**Does it prevent every reservation conflict?**

"It handles the current local demo transitions transactionally, but it is not a production-grade scheduling system yet. The next engineering step is stronger database-level conflict protection and concurrent-request testing."

**How could it grow or sustain itself?**

"The catalog model can support additional categories and item types without changing the student workflow. We would validate the process with Recreation staff first, then adapt it for another department only if that department has the same shared-equipment problem and ownership model."

**What would you build next?**

"Trevecca single sign-on, authenticated server-side permissions, better audit history, and a small pilot with real policies for loan duration, condition checks, and overdue items."
