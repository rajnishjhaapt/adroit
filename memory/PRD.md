# PRD — Adroit Management and Tax Consultants Website

## Original problem statement
The client's full master prompt is in the conversation history. In short: build a premium, fully responsive multi-page corporate website, not a mobile app, for "Adroit Management and Tax Consultants".
- Tagline: "Your Trusted Partner in Audit, Taxation & Business Advisory".
- Address: B-92, Sector-63, Noida – 201301, India.
- Phone and WhatsApp: +91 99993 15177 (https://wa.me/919999315177).
- Experience: "18+ Years of Experience" everywhere, with no "11+" wording anywhere.
- Palette: Navy #10243A, Gold #C6A15B, White, Light Grey #F3F6F9, Dark Text #243447.
- Pages: Home, About Us, Our Services, Our Team and Contact Us, plus booking, Privacy Policy and Terms.
- Services: exactly 10 categories with the exact sub-services, shown in an accordion, each with a detail page.
- Team: 3 partners and 3 associated CA firms. Swati Gupta & Company is a separate firm.
- Forms: contact and booking forms with a reference ID.
- Admin dashboard: enquiries (status, assignment, notes, history, CSV export), service management, content management and role-based access.
- Security, SEO and responsive design.
- Added feature: checkbox selection of categories and sub-services on the Services page, with "Enquire on WhatsApp" (prefilled wa.me message), a "select at least one" warning and Clear Selection.

## User choices (defaults; the questions were not answered)
- Sign-in uses email and password (Emergent-managed Clerk). The first admin is dhrubj49@gmail.com, set through ADMIN_EMAIL.
- Roles: admin sees everything. Staff see only enquiries assigned to them. New sign-ups are "pending" with no access until an admin approves them.
- Each new enquiry sends an email alert (Emergent-managed email) to NOTIFY_EMAIL, currently dhrubj49@gmail.com.
- The database is MongoDB, because the platform does not use Supabase.

## Architecture
- Backend: FastAPI in `server.py`, with `clerk_auth.py`, `notify.py` and `seed_data.py`. Collections: services, content, enquiries and users.
- Public API: `/api/content`, `/api/services`, `/api/services/{slug}`, `POST /api/enquiries` (validation, honeypot, 5 per 10 minutes per IP, deduplication by submission_key and recent identical submissions) and `/api/sitemap.xml`.
- Admin API (Clerk bearer token, roles read from the database):
  - `/api/me` and `/api/admin/stats`
  - `/api/admin/enquiries`, including detail, PATCH, notes and CSV export
  - `/api/admin/assignees`
  - `/api/admin/services`, including create, update, soft delete and reorder
  - `/api/admin/content`
  - `/api/users` and the role PATCH
- Frontend: React Router.
  - Public routes are wrapped in SiteLayout and use SiteProvider for content and services.
  - Admin, `/sign-in` and `/sign-up` sit under ClerkLayout.

## Implemented (2026-11-20)
- All public pages, the 10 service detail pages, the Services selection and WhatsApp feature, and the contact and booking forms with reference IDs.
- Admin dashboard: overview, enquiries, services, content, and staff and access.
- SEO metadata, robots.txt and sitemap.
- Testing iteration 1 passed: backend 20/20 and frontend 100%. Fixes after testing: concurrent duplicate submissions no longer return an error, reorder is validated, and small UI issues are fixed.

## Implemented (2026-11-21)
- Second office address added (Ofc. No. 103, H36, Sector 63, Near Electronic City Metro, Noida, 201301), editable in admin.
- Two new service categories (Audit & Assurance Services with 11 sub-services, and Trust Registration, Formation & Compliance Services with 15), added after the original 10 through seed v2. They are included automatically in the checkbox and WhatsApp selection, the form dropdowns, the footer and the sitemap.
- Partner profiles: clickable cards and /team/:slug pages with the exact quote and description, plus an editable photo URL (initials are shown when empty).
- About Us: Vision, Mission and six Core Values, all editable in admin.
- Testing iteration 2 passed. The services intro text and the sitemap were fixed afterwards.

## Implemented (2026-11-21, auth change)
- Clerk fully removed (backend module, frontend provider, sign-in/sign-up pages, package and env keys).
- Custom login at /admin/login with email and password only.
  - Main admin comes from env: ADMIN_EMAIL plus a PBKDF2 hash in ADMIN_PASSWORD_HASH. A password changed in the app is stored in db.meta admin_credentials.
  - Staff accounts are created by the admin with hashed passwords; roles are admin, staff or disabled.
- Sessions: HTTP-only, Secure, SameSite=Strict cookie lasting 8h (SESSION_HOURS). Only a hash of the token is stored in db.sessions, with a TTL index. Logout, change password and admin password reset are included.
- Lockout: 5 failures per IP and email, or 10 per email, within 15 minutes.
- Testing iterations 3 to 5 passed: backend 50/50 and frontend 100%.

## Implemented (2026-11-21, self-hosting prep)
- Enquiry rate limit moved from memory to MongoDB (enquiry_hits with a TTL index). No in-memory state is left, so multiple Uvicorn workers are safe.
- CORS_ORIGINS is now required from env. Email alerts are optional: they're skipped when EMERGENT_EMAIL_KEY is empty.
- Added /app/deploy:
  - DEPLOYMENT.md (Hostinger Ubuntu guide, MongoDB 7 with auth, backups and restore)
  - nginx/adroit.conf
  - adroit-backend.service (systemd unit for Uvicorn)
  - backend.env.example and frontend.env.production.example
  - scripts/backup_mongo.sh
- Added backend/scripts/make_admin_hash.py.
- Simulated production locally with a separate test database (Uvicorn, 2 workers, production-style env):
  - the empty database seeded 12 services
  - the rate limit returned 429 on the 6th submission
  - data persisted across a restart, admin login worked, and admin stats without login returned 401
- A production yarn build succeeded.
- Not yet done: an actual deployment to Hostinger. It needs the user's VPS and domain.

## Backlog
- P1: Client to review the content for ICAI and regulatory compliance. Add verified document lists and FAQs per service through the admin.
- P1: Add the map only once the exact office location is verified.
- P2: WhatsApp Business API alerts and CRM integration (needs credentials). Persistent rate limiting for multiple instances.
- P2: Team photos and designations, once supplied.
