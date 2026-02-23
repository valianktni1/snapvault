# SnapVault Events

A self-hosted guest photo, video & voice message upload platform for **Weddings**, **Birthdays** and **Corporate Events**. Guests scan a QR code or follow a link to upload their memories — no account needed.

## Features

- **3 Event Types**: Wedding, Birthday, Corporate — each with 4 beautiful templates (12 total)
- **Template Customisation**: Set event title, subtitle, date, and welcome message
- **Guest Upload Page**: Themed, drag & drop, no login required — photos, videos & voice messages
- **QR Code Sharing**: Instant QR code for each event, ready to print or display
- **Organizer Gallery**: Private gallery with lightbox preview, individual delete, and bulk ZIP download
- **Admin Panel**: Full platform control — manage all events, media, users, and storage
- **Video Compression**: FFmpeg auto-compresses videos over 80MB (CRF 18, max 1080p)
- **200MB** per file maximum — photos, videos, audio all supported
- **Self-hosted**: All media stored locally — perfect for TrueNAS Scale or any Linux server

## Tech Stack

- **Frontend**: React 19, Tailwind CSS, shadcn/ui, qrcode.react, react-dropzone
- **Backend**: FastAPI (Python), Motor (async MongoDB)
- **Database**: MongoDB
- **Storage**: Local filesystem (mountable NAS volume)
- **Auth**: JWT with bcrypt password hashing
- **Video Processing**: FFmpeg

---

## Self-Hosting on TrueNAS Scale

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/snapvault-events.git
cd snapvault-events
```

### 2. Configure Environment Variables

**Backend** (`backend/.env`):
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="snapvault_events"
JWT_SECRET_KEY="your-very-secure-random-string-change-this"
ADMIN_EMAIL="your@email.com"
CORS_ORIGINS="https://events.snapvault.uk"
UPLOAD_DIR="/mnt/tank/snapvault-uploads"
```

**Frontend** (`frontend/.env`):
```env
REACT_APP_BACKEND_URL=https://events.snapvault.uk
```

> Generate a secure JWT key: `openssl rand -hex 32`

### 3. Mount Your TrueNAS Storage

In TrueNAS Scale, create a dataset and set `UPLOAD_DIR` to its mount path:
```
UPLOAD_DIR="/mnt/pool/snapvault-uploads"
```

### 4. Install Dependencies

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd ../frontend
yarn install
yarn build
```

### 5. Configure Nginx (Reverse Proxy)

```nginx
server {
    listen 443 ssl;
    server_name events.snapvault.uk;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        client_max_body_size 210M;
        proxy_read_timeout 300s;
    }
}
```

> **Important**: Set `client_max_body_size 210M` to allow 200MB file uploads.

### 6. Set Admin Access

Set `ADMIN_EMAIL` in the backend `.env` to your email. When you register/login with that email, you automatically get the Admin Panel at `/admin`.

---

## Docker Compose (Alternative)

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit both .env files with your settings
docker-compose up -d
```

---

## Development Setup

```bash
# Start MongoDB (if not running)
mongod --dbpath /data/db

# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# Frontend (new terminal)
cd frontend
yarn install
yarn start
```

App runs at `http://localhost:3000`

---

## Environment Variables Reference

| Variable | Description | Default |
|---|---|---|
| `MONGO_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `DB_NAME` | Database name | `snapvault_events` |
| `JWT_SECRET_KEY` | Secret key for JWT signing | *required in production* |
| `ADMIN_EMAIL` | Email address with admin access | *empty (no admin)* |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `*` |
| `UPLOAD_DIR` | File storage directory | `/app/uploads` |
| `REACT_APP_BACKEND_URL` | Backend URL (frontend env) | *required* |

---

## Templates

### Wedding (Playfair Display font)
| Key | Name | Style |
|-----|------|-------|
| `floral` | Floral Romance | Blush rose / transparent |
| `minimalist` | Pure Minimalist | Clean slate / champagne |
| `vintage` | Golden Vintage | Warm amber / antique |
| `modern` | Midnight Modern | Deep navy / gold |

### Birthday
| Key | Name | Style |
|-----|------|-------|
| `confetti` | Confetti Party | Bright yellow / pink |
| `balloons` | Balloon Bliss | Sky blue / pastel |
| `elegant` | Birthday Luxe | Deep purple / gold |
| `kids` | Kids Fun | Blue / playful yellow |

### Corporate (Outfit font)
| Key | Name | Style |
|-----|------|-------|
| `modern_tech` | Modern Tech | Dark slate / cyan |
| `classic` | Classic Professional | Light slate / navy |
| `minimal` | Pure Minimal | White / black |
| `bold` | Bold & Dynamic | Deep purple / white |

---

## License

MIT — feel free to self-host, modify, and deploy.

---

*Built with SnapVault Events · Self-hosted · Private · Yours forever*
