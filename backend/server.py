from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
from passlib.context import CryptContext
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional
from dotenv import load_dotenv
import os
import uuid
import subprocess
import logging
import shutil
import zipfile
import io
import smtplib
import qrcode
from PIL import Image, ImageDraw, ImageFont
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'dev-secret-change-this')
JWT_ALGO = "HS256"
JWT_EXPIRE_DAYS = 30
UPLOAD_DIR = Path(os.environ.get('UPLOAD_DIR', '/app/uploads'))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 200 * 1024 * 1024  # 200MB
VIDEO_COMPRESS_THRESHOLD = 80 * 1024 * 1024  # 80MB
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', '').lower().strip()

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SnapVault Events API")
api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Models ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class EventCreate(BaseModel):
    title: str
    event_type: str
    template: str
    subtitle: str = ""
    welcome_message: str = ""
    event_date: str = ""

class EventUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    welcome_message: Optional[str] = None
    event_date: Optional[str] = None
    template: Optional[str] = None


# --- Helpers ---
def create_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    return jwt.encode({"sub": user_id, "exp": expire}, JWT_SECRET, algorithm=JWT_ALGO)


def is_admin(user: dict) -> bool:
    return (
        user.get('email', '').lower() == ADMIN_EMAIL
        or user.get('role') == 'admin'
    )


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(401, "Invalid token")
    except JWTError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(401, "User not found")
    return user


async def get_admin_user(current_user=Depends(get_current_user)):
    if not is_admin(current_user):
        raise HTTPException(403, "Admin access required")
    return current_user


def compress_video(input_path: Path, output_path: Path) -> bool:
    try:
        cmd = [
            'ffmpeg', '-i', str(input_path),
            '-vf', "scale=-2:'min(ih,1080)'",
            '-crf', '18', '-preset', 'medium',
            '-c:a', 'aac', '-b:a', '192k',
            '-movflags', '+faststart', '-y',
            str(output_path)
        ]
        result = subprocess.run(cmd, capture_output=True, timeout=600)
        return result.returncode == 0 and output_path.exists()
    except Exception as e:
        logger.error(f"Video compression failed: {e}")
        return False


def fmt_event(event: dict, media_count: int = 0) -> dict:
    return {
        "id": str(event["_id"]),
        "title": event["title"],
        "event_type": event["event_type"],
        "template": event["template"],
        "subtitle": event.get("subtitle", ""),
        "welcome_message": event.get("welcome_message", ""),
        "event_date": event.get("event_date", ""),
        "slug": event["slug"],
        "organizer_id": event["organizer_id"],
        "media_count": media_count,
        "is_paid": event.get("is_paid", False),
        "payment_status": event.get("payment_status", "unpaid"),
        "qr_template": event.get("qr_template", ""),
        "qr_size": event.get("qr_size", "10x8"),
        "created_at": event["created_at"]
    }


def fmt_media(m: dict) -> dict:
    return {
        "id": str(m["_id"]),
        "event_id": m["event_id"],
        "filename": m["filename"],
        "original_name": m["original_name"],
        "file_type": m["file_type"],
        "file_size": m["file_size"],
        "uploader_name": m["uploader_name"],
        "created_at": m["created_at"],
        "url": f"/api/files/{m['event_id']}/{m['filename']}"
    }


def fmt_user_response(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
        "role": "admin" if (user.get('email', '').lower() == ADMIN_EMAIL or user.get('role') == 'admin') else "organizer"
    }


# --- QR Card Templates (mirrors frontend PrintableQRCards.jsx) ---
QR_CARD_TEMPLATES = {
    "wedding": {
        "elegant_frame": {"bgColor": "#FDF8F3", "borderColor": "#D4AF37", "textColor": "#2C1810", "accentColor": "#D4AF37"},
        "romantic_floral": {"bgColor": "#FFF5F7", "borderColor": "#E8B4BC", "textColor": "#6B2D3D", "accentColor": "#D4869C"},
        "modern_minimal": {"bgColor": "#FFFFFF", "borderColor": "#1A1A1A", "textColor": "#1A1A1A", "accentColor": "#666666"},
        "rustic_kraft": {"bgColor": "#F5E6D3", "borderColor": "#8B7355", "textColor": "#4A3728", "accentColor": "#6B8E23"},
    },
    "birthday": {
        "confetti_party": {"bgColor": "#FFF9E6", "borderColor": "#FF6B9D", "textColor": "#333333", "accentColor": "#FF6B9D"},
        "balloon_fun": {"bgColor": "#E8F4FD", "borderColor": "#4ECDC4", "textColor": "#2C3E50", "accentColor": "#FF6B6B"},
        "elegant_gold": {"bgColor": "#1A1A2E", "borderColor": "#FFD700", "textColor": "#FFFFFF", "accentColor": "#FFD700"},
        "rainbow_bright": {"bgColor": "#FFFFFF", "borderColor": "#FF6B6B", "textColor": "#333333", "accentColor": "#4ECDC4"},
    },
    "corporate": {
        "professional_navy": {"bgColor": "#0F2744", "borderColor": "#3B82F6", "textColor": "#FFFFFF", "accentColor": "#60A5FA"},
        "clean_white": {"bgColor": "#FFFFFF", "borderColor": "#E5E7EB", "textColor": "#111827", "accentColor": "#6B7280"},
        "tech_modern": {"bgColor": "#111827", "borderColor": "#10B981", "textColor": "#FFFFFF", "accentColor": "#10B981"},
        "executive_grey": {"bgColor": "#F3F4F6", "borderColor": "#374151", "textColor": "#1F2937", "accentColor": "#4B5563"},
    },
}

QR_CARD_SIZES = {
    "10x8": (960, 768),
    "8x6": (768, 576),
}


def hex_to_rgb(hex_color: str) -> tuple:
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def generate_qr_card_image(event_type: str, template_key: str, size_key: str,
                           event_title: str, event_subtitle: str, guest_url: str) -> bytes:
    """Generate a printable QR card image with the QR code centered."""
    templates = QR_CARD_TEMPLATES.get(event_type, QR_CARD_TEMPLATES["wedding"])
    tmpl = templates.get(template_key)
    if not tmpl:
        tmpl = list(templates.values())[0]

    width, height = QR_CARD_SIZES.get(size_key, (960, 768))

    bg_rgb = hex_to_rgb(tmpl["bgColor"])
    border_rgb = hex_to_rgb(tmpl["borderColor"])
    text_rgb = hex_to_rgb(tmpl["textColor"])
    accent_rgb = hex_to_rgb(tmpl["accentColor"])

    img = Image.new("RGB", (width, height), bg_rgb)
    draw = ImageDraw.Draw(img)

    # Draw border
    bw = 6
    draw.rectangle([bw // 2, bw // 2, width - bw // 2, height - bw // 2], outline=border_rgb, width=bw)

    # Load fonts
    try:
        serif_bold = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf", int(width * 0.052))
        sans_reg = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", int(width * 0.028))
        sans_bold = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", int(width * 0.035))
    except Exception:
        serif_bold = ImageFont.load_default()
        sans_reg = ImageFont.load_default()
        sans_bold = ImageFont.load_default()

    # Header subtitle text
    header_map = {"wedding": "SHARE YOUR MEMORIES", "birthday": "CAPTURE THE FUN!", "corporate": "EVENT PHOTOS"}
    header_text = header_map.get(event_type, "EVENT PHOTOS")
    hbox = draw.textbbox((0, 0), header_text, font=sans_reg)
    draw.text(((width - (hbox[2] - hbox[0])) // 2, int(height * 0.07)), header_text, fill=accent_rgb, font=sans_reg)

    # Event title
    tbox = draw.textbbox((0, 0), event_title, font=serif_bold)
    title_w = tbox[2] - tbox[0]
    # If title is too wide, truncate
    display_title = event_title
    if title_w > width * 0.85:
        while title_w > width * 0.85 and len(display_title) > 10:
            display_title = display_title[:-1]
            tbox = draw.textbbox((0, 0), display_title + "...", font=serif_bold)
            title_w = tbox[2] - tbox[0]
        display_title += "..."
        tbox = draw.textbbox((0, 0), display_title, font=serif_bold)
        title_w = tbox[2] - tbox[0]
    draw.text(((width - title_w) // 2, int(height * 0.13)), display_title, fill=text_rgb, font=serif_bold)

    # Event subtitle
    if event_subtitle:
        sbox = draw.textbbox((0, 0), event_subtitle, font=sans_reg)
        draw.text(((width - (sbox[2] - sbox[0])) // 2, int(height * 0.21)), event_subtitle, fill=accent_rgb, font=sans_reg)

    # Generate QR code image
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=10, border=2)
    qr.add_data(guest_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")

    qr_size = int(min(width, height) * 0.40)
    qr_img = qr_img.resize((qr_size, qr_size), Image.LANCZOS)

    # Center the QR code
    qr_x = (width - qr_size) // 2
    qr_y = (height - qr_size) // 2

    # QR white background + border
    pad = 14
    draw.rectangle(
        [qr_x - pad, qr_y - pad, qr_x + qr_size + pad, qr_y + qr_size + pad],
        fill=(255, 255, 255), outline=border_rgb, width=4
    )
    img.paste(qr_img, (qr_x, qr_y))

    # Footer
    ft = "Scan to Upload"
    fbox = draw.textbbox((0, 0), ft, font=sans_bold)
    draw.text(((width - (fbox[2] - fbox[0])) // 2, int(height * 0.83)), ft, fill=text_rgb, font=sans_bold)

    pt = "Photos & Videos"
    pbox = draw.textbbox((0, 0), pt, font=sans_reg)
    draw.text(((width - (pbox[2] - pbox[0])) // 2, int(height * 0.89)), pt, fill=accent_rgb, font=sans_reg)

    bt = "SnapVault"
    bbox = draw.textbbox((0, 0), bt, font=sans_reg)
    draw.text(((width - (bbox[2] - bbox[0])) // 2, int(height * 0.94)), bt, fill=accent_rgb, font=sans_reg)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.getvalue()


async def send_qr_email(to_email: str, organizer_name: str, event_title: str,
                        event_date: str, qr_template_name: str, qr_size: str,
                        qr_image_bytes: bytes) -> bool:
    """Send the QR card image via email using saved SMTP settings."""
    settings = await db.settings.find_one({"type": "smtp"})
    if not settings or not settings.get("smtp_password"):
        logger.warning("SMTP not configured or password missing — skipping email")
        return False

    size_label = '10" x 8"' if qr_size == "10x8" else '8" x 6"'

    # Calculate 3-month deadline from event date
    deadline_text = ""
    if event_date:
        try:
            ed = datetime.fromisoformat(event_date)
            deadline = ed + timedelta(days=90)
            deadline_text = deadline.strftime("%d %B %Y")
        except Exception:
            deadline_text = ""

    try:
        msg = MIMEMultipart()
        msg["From"] = settings["smtp_user"]
        msg["To"] = to_email
        msg["Subject"] = f"Your SnapVault QR Card is Ready — {event_title}"

        html = f"""<html><body style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:30px;color:#2C1810;background:#FDFAF6;">

<h2 style="color:#1a1a2e;margin-bottom:5px;">Thank You, {organizer_name}!</h2>

<p style="font-size:16px;line-height:1.6;">
We really appreciate you choosing <strong>SnapVault</strong> for your event. It means the world to us that you've trusted us to be part of <strong>{event_title}</strong> — we hope it's a truly wonderful occasion.
</p>

<p style="font-size:16px;line-height:1.6;">
Your payment has been confirmed and your personalised QR card is attached to this email, ready for you to print and display at your venue. Once your guests scan the code, they'll be able to upload their photos and videos straight to your private gallery.
</p>

<div style="background:#F5F0E8;border-radius:12px;padding:18px 22px;margin:20px 0;border-left:4px solid #C5A55A;">
  <p style="margin:0 0 6px 0;font-size:14px;color:#666;">Your Order Summary</p>
  <p style="margin:0;font-size:15px;"><strong>Event:</strong> {event_title}</p>
  <p style="margin:4px 0 0 0;font-size:15px;"><strong>Template:</strong> {qr_template_name}</p>
  <p style="margin:4px 0 0 0;font-size:15px;"><strong>Card Size:</strong> {size_label}</p>
</div>

<p style="font-size:16px;line-height:1.6;">
Your guest gallery will be available for <strong>three months from your event date</strong>{f" (until {deadline_text})" if deadline_text else ""} — that's plenty of time for you and your guests to browse, relive the memories and download everything at your leisure. No rush at all!
</p>

<p style="font-size:16px;line-height:1.6;">
If you have any questions or need anything at all, don't hesitate to get in touch. We're here to help make your event as special as possible.
</p>

<p style="font-size:16px;line-height:1.6;margin-top:25px;">
Warm regards,<br/>
<strong>Mark</strong><br/>
<em>Weddings By Mark</em>
</p>

<hr style="border:none;border-top:1px solid #E5DDD0;margin:25px 0 15px 0;"/>
<p style="font-size:12px;color:#999;text-align:center;">
SnapVault — Designed and hosted by Weddings By Mark
</p>

</body></html>"""
        msg.attach(MIMEText(html, "html"))

        safe_name = "".join(c if c.isalnum() or c in " _-" else "_" for c in event_title)
        image_part = MIMEImage(qr_image_bytes, name=f"{safe_name}_QR_Card.png")
        image_part.add_header("Content-Disposition", "attachment", filename=f"{safe_name}_QR_Card.png")
        msg.attach(image_part)

        port = int(settings["smtp_port"])
        if port == 465:
            with smtplib.SMTP_SSL(settings["smtp_host"], port, timeout=30) as server:
                server.login(settings["smtp_user"], settings["smtp_password"])
                server.sendmail(settings["smtp_user"], to_email, msg.as_string())
        else:
            with smtplib.SMTP(settings["smtp_host"], port, timeout=30) as server:
                server.starttls()
                server.login(settings["smtp_user"], settings["smtp_password"])
                server.sendmail(settings["smtp_user"], to_email, msg.as_string())

        logger.info(f"QR card email sent to {to_email} for event '{event_title}'")
        return True
    except Exception as e:
        logger.error(f"Email sending failed: {e}")
        return False


# --- Auth Routes ---
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    if await db.users.find_one({"email": user_data.email.lower()}):
        raise HTTPException(400, "Email already registered")
    doc = {
        "email": user_data.email.lower(),
        "name": user_data.name,
        "hashed_password": pwd_context.hash(user_data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    token = create_token(str(result.inserted_id))
    return {"token": token, "user": fmt_user_response(doc)}


@api_router.post("/auth/login")
async def login(creds: UserLogin):
    user = await db.users.find_one({"email": creds.email.lower()})
    if not user or not pwd_context.verify(creds.password, user["hashed_password"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_token(str(user["_id"]))
    return {"token": token, "user": fmt_user_response(user)}


@api_router.get("/auth/me")
async def me(current_user=Depends(get_current_user)):
    return fmt_user_response(current_user)


class ChangePassword(BaseModel):
    current_password: str
    new_password: str


@api_router.post("/auth/change-password")
async def change_password(data: ChangePassword, current_user=Depends(get_current_user)):
    # Verify current password
    if not pwd_context.verify(data.current_password, current_user["hashed_password"]):
        raise HTTPException(400, "Current password is incorrect")
    
    # Validate new password
    if len(data.new_password) < 6:
        raise HTTPException(400, "New password must be at least 6 characters")
    
    # Update password
    new_hash = pwd_context.hash(data.new_password)
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"hashed_password": new_hash}}
    )
    
    return {"message": "Password changed successfully"}


# --- Event Routes ---
@api_router.get("/events")
async def get_events(current_user=Depends(get_current_user)):
    events = await db.events.find(
        {"organizer_id": str(current_user["_id"])}
    ).sort("created_at", -1).to_list(100)
    result = []
    for e in events:
        count = await db.media.count_documents({"event_id": str(e["_id"])})
        result.append(fmt_event(e, count))
    return result


@api_router.post("/events")
async def create_event(event_data: EventCreate, current_user=Depends(get_current_user)):
    slug = str(uuid.uuid4())[:8]
    doc = {
        "title": event_data.title,
        "event_type": event_data.event_type,
        "template": event_data.template,
        "subtitle": event_data.subtitle,
        "welcome_message": event_data.welcome_message,
        "event_date": event_data.event_date,
        "slug": slug,
        "organizer_id": str(current_user["_id"]),
        "is_paid": False,
        "payment_status": "unpaid",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.events.insert_one(doc)
    (UPLOAD_DIR / str(result.inserted_id)).mkdir(exist_ok=True)
    return fmt_event({**doc, "_id": result.inserted_id}, 0)


@api_router.get("/events/{event_id}")
async def get_event(event_id: str, current_user=Depends(get_current_user)):
    query = {"_id": ObjectId(event_id)}
    if not is_admin(current_user):
        query["organizer_id"] = str(current_user["_id"])
    event = await db.events.find_one(query)
    if not event:
        raise HTTPException(404, "Event not found")
    count = await db.media.count_documents({"event_id": event_id})
    return fmt_event(event, count)


@api_router.put("/events/{event_id}")
async def update_event(event_id: str, event_data: EventUpdate, current_user=Depends(get_current_user)):
    query = {"_id": ObjectId(event_id)}
    if not is_admin(current_user):
        query["organizer_id"] = str(current_user["_id"])
    event = await db.events.find_one(query)
    if not event:
        raise HTTPException(404, "Event not found")
    updates = {k: v for k, v in event_data.model_dump().items() if v is not None}
    if updates:
        await db.events.update_one({"_id": ObjectId(event_id)}, {"$set": updates})
    updated = await db.events.find_one({"_id": ObjectId(event_id)})
    count = await db.media.count_documents({"event_id": event_id})
    return fmt_event(updated, count)


@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user=Depends(get_current_user)):
    query = {"_id": ObjectId(event_id)}
    if not is_admin(current_user):
        query["organizer_id"] = str(current_user["_id"])
    event = await db.events.find_one(query)
    if not event:
        raise HTTPException(404, "Event not found")
    event_dir = UPLOAD_DIR / event_id
    if event_dir.exists():
        shutil.rmtree(event_dir)
    await db.media.delete_many({"event_id": event_id})
    await db.events.delete_one({"_id": ObjectId(event_id)})
    return {"message": "Event deleted"}


# --- Bulk Download (ZIP) ---
@api_router.get("/events/{event_id}/download")
async def download_event_media(event_id: str, current_user=Depends(get_current_user)):
    query = {"_id": ObjectId(event_id)}
    if not is_admin(current_user):
        query["organizer_id"] = str(current_user["_id"])
    event = await db.events.find_one(query)
    if not event:
        raise HTTPException(404, "Event not found")

    media_list = await db.media.find({"event_id": event_id}).to_list(1000)
    if not media_list:
        raise HTTPException(404, "No media files to download")

    zip_buffer = io.BytesIO()
    seen_names: dict = {}
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for m in media_list:
            file_path = UPLOAD_DIR / event_id / m["filename"]
            if not file_path.exists():
                continue
            orig = m["original_name"]
            if orig in seen_names:
                seen_names[orig] += 1
                name, ext = os.path.splitext(orig)
                orig = f"{name}_{seen_names[orig]}{ext}"
            else:
                seen_names[orig] = 0
            zipf.write(str(file_path), orig)

    zip_buffer.seek(0)
    safe_title = event["title"].replace(' ', '_')[:50]
    safe_title = ''.join(c for c in safe_title if c.isalnum() or c in '_-')
    filename = f"{safe_title}_SnapVault.zip"

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# --- Public Guest Routes ---
@api_router.get("/guest/event/{slug}")
async def get_event_by_slug(slug: str):
    event = await db.events.find_one({"slug": slug})
    if not event:
        raise HTTPException(404, "Event not found")
    return {
        "id": str(event["_id"]),
        "title": event["title"],
        "event_type": event["event_type"],
        "template": event["template"],
        "subtitle": event.get("subtitle", ""),
        "welcome_message": event.get("welcome_message", ""),
        "event_date": event.get("event_date", "")
    }


@api_router.post("/guest/event/{slug}/upload")
async def upload_media(
    slug: str,
    file: UploadFile = File(...),
    uploader_name: str = Form(default="Guest")
):
    event = await db.events.find_one({"slug": slug})
    if not event:
        raise HTTPException(404, "Event not found")

    event_id = str(event["_id"])
    content_type = file.content_type or ""
    is_video = content_type.startswith("video/")
    is_image = content_type.startswith("image/")
    is_audio = content_type.startswith("audio/")

    if not (is_video or is_image or is_audio):
        raise HTTPException(400, "Only images, videos and audio files are supported")

    event_dir = UPLOAD_DIR / event_id
    event_dir.mkdir(exist_ok=True)

    suffix = Path(file.filename or "upload").suffix or (
        '.mp4' if is_video else '.mp3' if is_audio else '.jpg'
    )
    unique_name = f"{uuid.uuid4()}{suffix}"
    file_path = event_dir / unique_name
    file_size = 0

    try:
        with open(file_path, "wb") as f:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                file_size += len(chunk)
                if file_size > MAX_FILE_SIZE:
                    f.close()
                    file_path.unlink(missing_ok=True)
                    raise HTTPException(400, "File exceeds 200MB limit")
                f.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        file_path.unlink(missing_ok=True)
        raise HTTPException(500, f"Upload failed: {str(e)}")

    final_name = unique_name
    if is_video and file_size > VIDEO_COMPRESS_THRESHOLD:
        compressed_name = f"c_{unique_name}"
        compressed_path = event_dir / compressed_name
        logger.info(f"Compressing video {unique_name} ({file_size / 1024 / 1024:.1f}MB)")
        if compress_video(file_path, compressed_path):
            file_path.unlink(missing_ok=True)
            final_name = compressed_name
            file_size = compressed_path.stat().st_size
            logger.info(f"Compressed to {file_size / 1024 / 1024:.1f}MB")

    file_type = "video" if is_video else "audio" if is_audio else "image"
    doc = {
        "event_id": event_id,
        "filename": final_name,
        "original_name": file.filename or "upload",
        "file_type": file_type,
        "file_size": file_size,
        "uploader_name": uploader_name or "Guest",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.media.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Upload successful", "file_type": file_type}


# --- Organizer Media Routes ---
@api_router.get("/events/{event_id}/media")
async def get_event_media(event_id: str, current_user=Depends(get_current_user)):
    query = {"_id": ObjectId(event_id)}
    if not is_admin(current_user):
        query["organizer_id"] = str(current_user["_id"])
    event = await db.events.find_one(query)
    if not event:
        raise HTTPException(404, "Event not found")
    media_list = await db.media.find({"event_id": event_id}).sort("created_at", -1).to_list(1000)
    return [fmt_media(m) for m in media_list]


@api_router.delete("/media/{media_id}")
async def delete_media(media_id: str, current_user=Depends(get_current_user)):
    m = await db.media.find_one({"_id": ObjectId(media_id)})
    if not m:
        raise HTTPException(404, "Media not found")
    if not is_admin(current_user):
        event = await db.events.find_one({
            "_id": ObjectId(m["event_id"]),
            "organizer_id": str(current_user["_id"])
        })
        if not event:
            raise HTTPException(403, "Not authorized")
    (UPLOAD_DIR / m["event_id"] / m["filename"]).unlink(missing_ok=True)
    await db.media.delete_one({"_id": ObjectId(media_id)})
    return {"message": "Deleted"}


# --- File Serving (public - UUID filenames are unguessable) ---
@api_router.get("/files/{event_id}/{filename}")
async def serve_file(event_id: str, filename: str):
    file_path = UPLOAD_DIR / event_id / filename
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(str(file_path))


# --- Admin Routes ---
@api_router.get("/admin/stats")
async def admin_stats(current_user=Depends(get_admin_user)):
    total_users = await db.users.count_documents({})
    total_events = await db.events.count_documents({})
    total_media = await db.media.count_documents({})
    storage_bytes = sum(
        f.stat().st_size for f in UPLOAD_DIR.rglob("*") if f.is_file()
    ) if UPLOAD_DIR.exists() else 0
    return {
        "total_users": total_users,
        "total_events": total_events,
        "total_media": total_media,
        "storage_used_mb": round(storage_bytes / 1024 / 1024, 1)
    }


@api_router.get("/admin/events")
async def admin_get_events(current_user=Depends(get_admin_user)):
    events = await db.events.find({}).sort("created_at", -1).to_list(1000)
    result = []
    for e in events:
        count = await db.media.count_documents({"event_id": str(e["_id"])})
        organizer = await db.users.find_one({"_id": ObjectId(e["organizer_id"])})
        event_data = fmt_event(e, count)
        event_data["organizer_name"] = organizer["name"] if organizer else "Unknown"
        event_data["organizer_email"] = organizer["email"] if organizer else "Unknown"
        result.append(event_data)
    return result


@api_router.get("/admin/users")
async def admin_get_users(current_user=Depends(get_admin_user)):
    users = await db.users.find({}).sort("created_at", -1).to_list(1000)
    result = []
    for u in users:
        count = await db.events.count_documents({"organizer_id": str(u["_id"])})
        result.append({
            "id": str(u["_id"]),
            "name": u["name"],
            "email": u["email"],
            "role": "admin" if u.get('email', '').lower() == ADMIN_EMAIL else "organizer",
            "events_count": count,
            "created_at": u.get("created_at", "")
        })
    return result


@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, current_user=Depends(get_admin_user)):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(404, "User not found")
    # Delete all their events and media
    events = await db.events.find({"organizer_id": user_id}).to_list(1000)
    for e in events:
        event_id = str(e["_id"])
        event_dir = UPLOAD_DIR / event_id
        if event_dir.exists():
            shutil.rmtree(event_dir)
        await db.media.delete_many({"event_id": event_id})
    await db.events.delete_many({"organizer_id": user_id})
    await db.users.delete_one({"_id": ObjectId(user_id)})
    return {"message": "User and all their data deleted"}


# --- SMTP Settings Routes (Admin) ---
class SMTPSettingsInput(BaseModel):
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: str = ""


@api_router.get("/admin/settings/smtp")
async def get_smtp_settings(current_user=Depends(get_admin_user)):
    settings = await db.settings.find_one({"type": "smtp"})
    if not settings:
        return {
            "smtp_host": "smtp.hostinger.com",
            "smtp_port": 465,
            "smtp_user": "admin@snapvault.uk",
            "smtp_password": ""
        }
    return {
        "smtp_host": settings["smtp_host"],
        "smtp_port": settings["smtp_port"],
        "smtp_user": settings["smtp_user"],
        "smtp_password": "********" if settings.get("smtp_password") else ""
    }


@api_router.post("/admin/settings/smtp")
async def save_smtp_settings(data: SMTPSettingsInput, current_user=Depends(get_admin_user)):
    existing = await db.settings.find_one({"type": "smtp"})
    doc = {
        "type": "smtp",
        "smtp_host": data.smtp_host,
        "smtp_port": data.smtp_port,
        "smtp_user": data.smtp_user,
    }
    # Only update password if a real value was provided (not the mask)
    if data.smtp_password and data.smtp_password != "********":
        doc["smtp_password"] = data.smtp_password
    elif existing and existing.get("smtp_password"):
        doc["smtp_password"] = existing["smtp_password"]
    else:
        doc["smtp_password"] = ""

    await db.settings.update_one({"type": "smtp"}, {"$set": doc}, upsert=True)
    return {"message": "SMTP settings saved successfully"}


@api_router.post("/admin/settings/smtp/test")
async def test_smtp_settings(current_user=Depends(get_admin_user)):
    """Send a test email to the admin to verify SMTP configuration."""
    settings = await db.settings.find_one({"type": "smtp"})
    if not settings or not settings.get("smtp_password"):
        raise HTTPException(400, "SMTP password not configured. Please save your password first.")
    try:
        msg = MIMEMultipart()
        msg["From"] = settings["smtp_user"]
        msg["To"] = current_user["email"]
        msg["Subject"] = "SnapVault SMTP Test"
        msg.attach(MIMEText("<p>This is a test email from SnapVault. Your SMTP settings are working correctly!</p>", "html"))

        port = int(settings["smtp_port"])
        if port == 465:
            with smtplib.SMTP_SSL(settings["smtp_host"], port, timeout=15) as server:
                server.login(settings["smtp_user"], settings["smtp_password"])
                server.sendmail(settings["smtp_user"], current_user["email"], msg.as_string())
        else:
            with smtplib.SMTP(settings["smtp_host"], port, timeout=15) as server:
                server.starttls()
                server.login(settings["smtp_user"], settings["smtp_password"])
                server.sendmail(settings["smtp_user"], current_user["email"], msg.as_string())
        return {"message": f"Test email sent to {current_user['email']}"}
    except Exception as e:
        raise HTTPException(400, f"SMTP test failed: {str(e)}")


# --- Payment Routes ---
class PaymentSubmit(BaseModel):
    qr_template: str
    qr_size: str = "10x8"
    guest_url: str


@api_router.post("/events/{event_id}/submit-payment")
async def submit_payment(event_id: str, data: PaymentSubmit, current_user=Depends(get_current_user)):
    """Organiser submits that they have sent PayPal payment. Sets status to awaiting_approval."""
    event = await db.events.find_one({
        "_id": ObjectId(event_id),
        "organizer_id": str(current_user["_id"])
    })
    if not event:
        raise HTTPException(404, "Event not found")

    if event.get("is_paid"):
        raise HTTPException(400, "This event is already approved and paid")

    await db.events.update_one(
        {"_id": ObjectId(event_id)},
        {"$set": {
            "payment_status": "awaiting_approval",
            "qr_template": data.qr_template,
            "qr_size": data.qr_size,
            "guest_url": data.guest_url,
            "submitted_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    return {
        "message": "Payment submitted — awaiting admin approval",
        "payment_status": "awaiting_approval"
    }


@api_router.post("/admin/events/{event_id}/approve-payment")
async def approve_payment(event_id: str, current_user=Depends(get_admin_user)):
    """Admin approves payment. Generates QR card and emails it to the organiser."""
    event = await db.events.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(404, "Event not found")

    if event.get("is_paid"):
        raise HTTPException(400, "Already approved")

    organizer = await db.users.find_one({"_id": ObjectId(event["organizer_id"])})
    if not organizer:
        raise HTTPException(404, "Organiser not found")

    # Mark as paid
    await db.events.update_one(
        {"_id": ObjectId(event_id)},
        {"$set": {
            "is_paid": True,
            "payment_status": "approved",
            "paid_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": str(current_user["_id"])
        }}
    )

    # Generate QR card and send email
    email_sent = False
    guest_url = event.get("guest_url", "")
    qr_template = event.get("qr_template", "")
    qr_size = event.get("qr_size", "10x8")

    # Look up template display name
    qr_template_name = qr_template.replace("_", " ").title()

    if guest_url and qr_template:
        try:
            qr_image = generate_qr_card_image(
                event_type=event["event_type"],
                template_key=qr_template,
                size_key=qr_size,
                event_title=event["title"],
                event_subtitle=event.get("subtitle", ""),
                guest_url=guest_url
            )
            email_sent = await send_qr_email(
                to_email=organizer["email"],
                organizer_name=organizer.get("name", ""),
                event_title=event["title"],
                event_date=event.get("event_date", ""),
                qr_template_name=qr_template_name,
                qr_size=qr_size,
                qr_image_bytes=qr_image
            )
        except Exception as e:
            logger.error(f"QR card generation/email failed for event {event_id}: {e}")

    return {
        "message": "Payment approved — QR card sent to organiser" if email_sent else "Payment approved — email could not be sent (check SMTP settings)",
        "is_paid": True,
        "email_sent": email_sent
    }


# --- Health Check ---
@api_router.get("/health")
async def health_check():
    try:
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(503, f"Unhealthy: {str(e)}")


app.include_router(api_router)


@app.on_event("shutdown")
async def shutdown():
    client.close()
