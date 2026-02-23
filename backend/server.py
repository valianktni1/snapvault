from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
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
import os, uuid, subprocess, logging, shutil

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
    token = create_token(str(result.inserted_id))
    return {"token": token, "user": {"id": str(result.inserted_id), "email": doc["email"], "name": doc["name"]}}


@api_router.post("/auth/login")
async def login(creds: UserLogin):
    user = await db.users.find_one({"email": creds.email.lower()})
    if not user or not pwd_context.verify(creds.password, user["hashed_password"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_token(str(user["_id"]))
    return {"token": token, "user": {"id": str(user["_id"]), "email": user["email"], "name": user["name"]}}


@api_router.get("/auth/me")
async def me(current_user=Depends(get_current_user)):
    return {"id": str(current_user["_id"]), "email": current_user["email"], "name": current_user["name"]}


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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.events.insert_one(doc)
    (UPLOAD_DIR / str(result.inserted_id)).mkdir(exist_ok=True)
    return fmt_event({**doc, "_id": result.inserted_id}, 0)


@api_router.get("/events/{event_id}")
async def get_event(event_id: str, current_user=Depends(get_current_user)):
    event = await db.events.find_one({"_id": ObjectId(event_id), "organizer_id": str(current_user["_id"])})
    if not event:
        raise HTTPException(404, "Event not found")
    count = await db.media.count_documents({"event_id": event_id})
    return fmt_event(event, count)


@api_router.put("/events/{event_id}")
async def update_event(event_id: str, event_data: EventUpdate, current_user=Depends(get_current_user)):
    event = await db.events.find_one({"_id": ObjectId(event_id), "organizer_id": str(current_user["_id"])})
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
    event = await db.events.find_one({"_id": ObjectId(event_id), "organizer_id": str(current_user["_id"])})
    if not event:
        raise HTTPException(404, "Event not found")
    event_dir = UPLOAD_DIR / event_id
    if event_dir.exists():
        shutil.rmtree(event_dir)
    await db.media.delete_many({"event_id": event_id})
    await db.events.delete_one({"_id": ObjectId(event_id)})
    return {"message": "Event deleted"}


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

    if not (is_video or is_image):
        raise HTTPException(400, "Only images and videos are supported")

    event_dir = UPLOAD_DIR / event_id
    event_dir.mkdir(exist_ok=True)

    suffix = Path(file.filename or "upload").suffix or ('.mp4' if is_video else '.jpg')
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

    doc = {
        "event_id": event_id,
        "filename": final_name,
        "original_name": file.filename or "upload",
        "file_type": "video" if is_video else "image",
        "file_size": file_size,
        "uploader_name": uploader_name or "Guest",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.media.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Upload successful", "file_type": doc["file_type"]}


# --- Organizer Media Routes ---
@api_router.get("/events/{event_id}/media")
async def get_event_media(event_id: str, current_user=Depends(get_current_user)):
    event = await db.events.find_one({"_id": ObjectId(event_id), "organizer_id": str(current_user["_id"])})
    if not event:
        raise HTTPException(404, "Event not found")
    media_list = await db.media.find({"event_id": event_id}).sort("created_at", -1).to_list(1000)
    return [fmt_media(m) for m in media_list]


@api_router.delete("/media/{media_id}")
async def delete_media(media_id: str, current_user=Depends(get_current_user)):
    m = await db.media.find_one({"_id": ObjectId(media_id)})
    if not m:
        raise HTTPException(404, "Media not found")
    event = await db.events.find_one({"_id": ObjectId(m["event_id"]), "organizer_id": str(current_user["_id"])})
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


app.include_router(api_router)


@app.on_event("shutdown")
async def shutdown():
    client.close()
