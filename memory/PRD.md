# SnapVault Events — PRD

## Overview
Self-hosted guest photo & video upload platform for Weddings, Birthdays & Corporate Events.
Deployed at events.snapvault.uk on TrueNAS Scale.

## Architecture
- **Frontend**: React 19, Tailwind CSS, shadcn/ui, react-dropzone, qrcode.react
- **Backend**: FastAPI (Python), Motor (async MongoDB), JWT auth, FFmpeg video compression
- **Storage**: Local filesystem at `/app/uploads` (mountable TrueNAS volume)
- **Database**: MongoDB (`test_database`)

## User Personas
1. **Event Organizer** — Creates events, customizes templates, shares QR/link with guests, views/manages gallery
2. **Guest** — Scans QR or follows link, uploads photos/videos without login

## Core Requirements
- Organizer email/password auth (JWT, 30-day tokens)
- 3 event types: Wedding, Birthday, Corporate
- 4 templates per event type (12 total) with unique color palettes & fonts
- Template customization: title, subtitle, date, welcome message
- Guest upload page (public): drag & drop, 200MB max per file, multiple files
- Video auto-compression via FFmpeg (CRF 18, max 1080p) for videos > 80MB
- QR code generation (client-side, qrcode.react)
- Organizer media gallery: view, download, delete, lightbox preview
- File serving via `/api/files/{event_id}/{filename}` (UUID-based filenames)

## Templates
### Wedding (Playfair Display)
- Floral Romance (rose/pink)
- Pure Minimalist (slate/white)
- Golden Vintage (yellow/amber)
- Midnight Modern (navy/gold)

### Birthday (Fredoka/Chewy)
- Confetti Party (yellow/pink)
- Balloon Bliss (sky blue)
- Birthday Luxe (purple/gold)
- Kids Fun (blue/yellow, Chewy font)

### Corporate (Outfit)
- Modern Tech (dark slate/cyan)
- Classic Professional (light slate/navy)
- Pure Minimal (white/black)
- Bold & Dynamic (purple/white)

## What's Been Implemented
- **2026-02-xx**: Full MVP
  - JWT auth (register/login)
  - Event CRUD with 12 templates
  - Guest upload page (themed, drag & drop, progress bar)
  - Video compression via FFmpeg (CRF 18, 1080p max, threshold 80MB)
  - Organizer gallery with lightbox, download, delete
  - QR code generation
  - Dashboard with stats
  - 3-step event creation wizard

## Prioritized Backlog
### P0 (Critical)
- [x] Auth system
- [x] Event creation with templates
- [x] Guest upload with compression
- [x] Organizer gallery

### P1 (High)
- [ ] Bulk download (ZIP all media for an event)
- [ ] Email notifications when guests upload
- [ ] Event password protection

### P2 (Nice to have)
- [ ] Guest gallery view (let guests see other uploads)
- [ ] Custom domain per event
- [ ] Analytics dashboard (upload times, device types)
- [ ] Watermarking for downloaded images

## Self-Hosting Notes
- Mount TrueNAS volume to `/app/uploads`
- Set `JWT_SECRET_KEY` in `/app/backend/.env` to a secure random string
- Set `UPLOAD_DIR` env var if using custom storage path
- FFmpeg required (installed in container)
