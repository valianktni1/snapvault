# SnapVault - Product Requirements Document

## Original Problem Statement
Build a web application called "GuestPix/SnapVault" for events (weddings, birthdays, corporate). Guests upload photos, videos, and audio. Organizers choose from printable QR card templates. Self-hosted on TrueNAS Scale via Docker/Dockge.

## Core Requirements
- **User Roles:** Admin (full platform access), Organizer (manages own events)
- **Event Types:** Wedding, Birthday, Corporate - each with 4 templates
- **Media Upload:** Photos, videos, audio - max 200MB, video compression >80MB
- **QR Cards:** 4 printable templates per event type, sizes 10"x8" and 8"x6"
- **Payment:** £40 one-time fee via PayPal.me (trust-based verification)
- **Email:** QR card sent to organizer's email after payment (SMTP via Hostinger)
- **Admin:** SMTP settings, password change, user/event management

## Architecture
- **Frontend:** React + TailwindCSS + Shadcn UI
- **Backend:** FastAPI + Motor (async MongoDB)
- **Database:** MongoDB
- **Deployment:** Docker Compose on TrueNAS/Dockge

## What's Implemented (as of Feb 2026)
- [x] User authentication (register, login, JWT)
- [x] Event creation with type/template selection
- [x] Media upload (photo, video, audio) with compression
- [x] Printable QR card templates (4 per event type, 2 sizes)
- [x] Admin dashboard (stats, events, users management)
- [x] Admin password change
- [x] Bulk media download as ZIP
- [x] Guest upload page (public, no auth required)
- [x] Docker deployment for TrueNAS
- [x] **Payment Gate** - £40 PayPal.me integration with trust-based confirmation
- [x] **SMTP Settings** - Admin panel for email config (pre-filled Hostinger defaults)
- [x] **QR Card Email** - Generated QR card image sent via email after payment
- [x] **Payment Flow** - Template selection → PayPal → Confirm → QR unlocked + emailed
- [x] **New Logo** - SnapVault padlock/swirl branding logo
- [x] **QR Card Download Fix** - Local QR generation (no external API/CORS issues)
- [x] **Footer Branding** - "SnapVault designed and hosted by Weddings By Mark" on every page

## Key Endpoints
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/auth/change-password`
- `POST /api/events`, `GET /api/events`, `GET/PUT/DELETE /api/events/{id}`
- `GET /api/events/{event_id}/download` (ZIP)
- `POST /api/events/{event_id}/confirm-payment` (payment confirmation)
- `GET/POST /api/admin/settings/smtp` (SMTP config)
- `POST /api/admin/settings/smtp/test` (test email)
- `GET /api/admin/stats`, `GET /api/admin/events`, `GET /api/admin/users`
- `DELETE /api/admin/users/{id}`
- `GET /api/guest/event/{slug}`, `POST /api/guest/event/{slug}/upload`

## DB Schema
- **users:** `{email, name, hashed_password, created_at}`
- **events:** `{title, event_type, template, subtitle, welcome_message, event_date, slug, organizer_id, is_paid, qr_template, qr_size, paid_at, created_at}`
- **media:** `{event_id, filename, original_name, file_type, file_size, uploader_name, created_at}`
- **settings:** `{type:"smtp", smtp_host, smtp_port, smtp_user, smtp_password}`

## Backlog
- P2: Analytics/reporting for events
- P2: Customizable payment amount per event
- P3: Automated PayPal IPN/webhook verification
