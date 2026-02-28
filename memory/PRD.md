# SnapVault Events (GuestPix) - Product Requirements Document

## Original Problem Statement
Build a web application called "GuestPix" / "SnapVault" for events (weddings, birthdays, corporate). Allow guests to upload photos, videos, and audio. Event organizers manage events with customizable QR code templates. Admin approves payments and manages the platform.

## Core Requirements
- **Guest Uploads:** Photos, videos (max 200MB, compression >80MB), audio messages
- **QR Templates:** 4 templates per event type (Wedding, Birthday, Corporate) in 2 sizes
- **User Roles:** Admin (full platform access) + Organizer (own events)
- **Payment:** Fixed £40 fee via PayPal, admin-approved. Triggers personalized email with QR card
- **Email:** SMTP-based (Hostinger), admin-configurable in UI
- **Branding:** Custom logo, persistent "SnapVault designed and hosted by Weddings By Mark" footer
- **Deployment:** Self-hosted on TrueNAS via Docker/Dockge

## Tech Stack
- **Frontend:** React, TailwindCSS, react-router-dom, axios, qrcode (local generation)
- **Backend:** FastAPI, Pydantic, Motor (async MongoDB), FFmpeg, JWT (python-jose)
- **Database:** MongoDB
- **Deployment:** Docker Compose, Nginx

## Architecture
```
/app/
├── backend/
│   ├── .env (MONGO_URL, DB_NAME, JWT_SECRET_KEY, ADMIN_EMAIL, UPLOAD_DIR)
│   ├── requirements.txt
│   ├── server.py (main app - models, routes, helpers)
│   └── tests/
│       └── test_forgot_password.py
├── frontend/
│   ├── .env (REACT_APP_BACKEND_URL)
│   ├── package.json
│   └── src/
│       ├── App.js, App.css
│       ├── components/ (Layout.jsx, PrintableQRCards.jsx)
│       ├── context/ (AuthContext.js)
│       ├── pages/ (Auth.jsx, ResetPassword.jsx, AdminDashboard.jsx, CreateEvent.jsx, EventManage.jsx, GuestUpload.jsx, Dashboard.jsx, OrganizerGallery.jsx)
│       └── utils/ (api.js)
```

## DB Schema
- **users:** `{_id, email, hashed_password, name, role, created_at}`
- **events:** `{_id, title, event_type, template, subtitle, welcome_message, event_date, slug, organizer_id, is_paid, payment_status, qr_template, qr_size, guest_url, created_at}`
- **media:** `{_id, event_id, filename, original_name, file_type, file_size, uploader_name, created_at}`
- **settings:** `{_id, type:"smtp", smtp_host, smtp_port, smtp_user, smtp_password}`

## Completed Features
- [x] User auth (register/login) with JWT
- [x] Admin & organizer roles
- [x] Event CRUD with slug-based guest access
- [x] Media upload (photo/video/audio) with video compression
- [x] QR code templates (12 designs across 3 event types)
- [x] Admin dashboard (stats, users, events management)
- [x] Admin SMTP settings management with test email
- [x] Admin password change
- [x] Payment flow (PayPal manual → admin approval → email with QR card)
- [x] Personalized confirmation email with order summary
- [x] Custom branding (logo + footer)
- [x] QR code local generation (no CORS issues)
- [x] Bulk media download (ZIP)
- [x] Forgot Password feature (completed 2026-02-27)
- [x] JSON-LD schema markup for SEO (completed 2026-02-28)
- [x] llms.txt for LLM discoverability (completed 2026-02-28)
- [x] Premium wedding QR card templates: Golden Elegance, Botanical Garden, Midnight Romance + Clean Elegant (completed 2026-02-28)

## Backlog
- [ ] **P2:** Improve Birthday & Corporate QR Code Templates (apply same premium background image approach)
- [ ] **P2:** Refactor server.py into /routes, /models, /services

## Key API Endpoints
- `POST /api/auth/register`, `/api/auth/login`, `/api/auth/me`
- `POST /api/auth/change-password`
- `POST /api/auth/forgot-password` (accepts site_url for self-hosted reset links)
- `POST /api/auth/reset-password` (token-based)
- `GET/POST/PUT/DELETE /api/events/*`
- `POST /api/events/{id}/submit-payment`
- `POST /api/admin/events/{id}/approve-payment`
- `GET/POST /api/admin/settings/smtp`
- `POST /api/admin/settings/smtp/test`

## Credentials
- **Admin:** admin@snapvault.uk
- **3rd Party:** PayPal.me (manual), Hostinger SMTP
