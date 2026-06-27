import os
import uuid
import json
import re
import logging
import secrets
from datetime import datetime, timedelta, timezone, date
from pathlib import Path
from typing import List, Optional, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordBearer
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from passlib.context import CryptContext
import jwt
import httpx


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
SECRET_KEY = os.environ["JWT_SECRET"]
ALGORITHM = os.environ["JWT_ALGORITHM"]
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"])
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
users = db.users
quests = db.quests
quest_logs = db.quest_logs
journals = db.journals
friend_requests = db.friend_requests
friendships = db.friendships
high_fives = db.high_fives
push_tokens = db.push_tokens

app = FastAPI(title="GRYND API")
api = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["auth"])
quest_router = APIRouter(prefix="/quests", tags=["quests"])
journal_router = APIRouter(prefix="/journals", tags=["journals"])
board_router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])
monet_router = APIRouter(prefix="/monetization", tags=["monetization"])
ai_router = APIRouter(prefix="/ai", tags=["ai"])
social_router = APIRouter(prefix="/social", tags=["social"])
profile_router = APIRouter(prefix="/u", tags=["public"])  # public profile at /api/u/{username}
push_router = APIRouter(prefix="/push", tags=["push"])

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("grynd")


# ---------- Starter quests (12 languages) ----------
STARTER_QUESTS_BY_LANG: dict[str, list[dict]] = {
    "en": [
        {"title": "Drink 8 glasses of water", "xp_reward": 20, "icon": "💧", "difficulty": "easy", "category": "health"},
        {"title": "Read for 10 minutes", "xp_reward": 30, "icon": "📚", "difficulty": "easy", "category": "study"},
        {"title": "Exercise for 20 minutes", "xp_reward": 50, "icon": "🏃", "difficulty": "medium", "category": "health"},
        {"title": "Meditate for 5 minutes", "xp_reward": 25, "icon": "🧘", "difficulty": "easy", "category": "mind"},
        {"title": "No social media for 1 hour", "xp_reward": 40, "icon": "📵", "difficulty": "medium", "category": "mind"},
    ],
    "id": [
        {"title": "Minum 8 gelas air", "xp_reward": 20, "icon": "💧", "difficulty": "easy", "category": "health"},
        {"title": "Baca 10 menit", "xp_reward": 30, "icon": "📚", "difficulty": "easy", "category": "study"},
        {"title": "Olahraga 20 menit", "xp_reward": 50, "icon": "🏃", "difficulty": "medium", "category": "health"},
        {"title": "Meditasi 5 menit", "xp_reward": 25, "icon": "🧘", "difficulty": "easy", "category": "mind"},
        {"title": "No sosmed 1 jam", "xp_reward": 40, "icon": "📵", "difficulty": "medium", "category": "mind"},
    ],
    "es": [
        {"title": "Beber 8 vasos de agua", "xp_reward": 20, "icon": "💧", "difficulty": "easy", "category": "health"},
        {"title": "Leer 10 minutos", "xp_reward": 30, "icon": "📚", "difficulty": "easy", "category": "study"},
        {"title": "Ejercicio 20 minutos", "xp_reward": 50, "icon": "🏃", "difficulty": "medium", "category": "health"},
        {"title": "Meditar 5 minutos", "xp_reward": 25, "icon": "🧘", "difficulty": "easy", "category": "mind"},
        {"title": "Sin redes sociales 1 hora", "xp_reward": 40, "icon": "📵", "difficulty": "medium", "category": "mind"},
    ],
    "fr": [
        {"title": "Boire 8 verres d'eau", "xp_reward": 20, "icon": "💧", "difficulty": "easy", "category": "health"},
        {"title": "Lire 10 minutes", "xp_reward": 30, "icon": "📚", "difficulty": "easy", "category": "study"},
        {"title": "Sport 20 minutes", "xp_reward": 50, "icon": "🏃", "difficulty": "medium", "category": "health"},
        {"title": "Méditer 5 minutes", "xp_reward": 25, "icon": "🧘", "difficulty": "easy", "category": "mind"},
        {"title": "Sans réseaux sociaux 1 heure", "xp_reward": 40, "icon": "📵", "difficulty": "medium", "category": "mind"},
    ],
    "de": [
        {"title": "8 Gläser Wasser trinken", "xp_reward": 20, "icon": "💧", "difficulty": "easy", "category": "health"},
        {"title": "10 Minuten lesen", "xp_reward": 30, "icon": "📚", "difficulty": "easy", "category": "study"},
        {"title": "20 Minuten Sport", "xp_reward": 50, "icon": "🏃", "difficulty": "medium", "category": "health"},
        {"title": "5 Minuten meditieren", "xp_reward": 25, "icon": "🧘", "difficulty": "easy", "category": "mind"},
        {"title": "1 Stunde kein Social Media", "xp_reward": 40, "icon": "📵", "difficulty": "medium", "category": "mind"},
    ],
    "pt": [
        {"title": "Beber 8 copos de água", "xp_reward": 20, "icon": "💧", "difficulty": "easy", "category": "health"},
        {"title": "Ler por 10 minutos", "xp_reward": 30, "icon": "📚", "difficulty": "easy", "category": "study"},
        {"title": "Exercício por 20 minutos", "xp_reward": 50, "icon": "🏃", "difficulty": "medium", "category": "health"},
        {"title": "Meditar 5 minutos", "xp_reward": 25, "icon": "🧘", "difficulty": "easy", "category": "mind"},
        {"title": "Sem redes sociais 1 hora", "xp_reward": 40, "icon": "📵", "difficulty": "medium", "category": "mind"},
    ],
    "ru": [
        {"title": "Выпить 8 стаканов воды", "xp_reward": 20, "icon": "💧", "difficulty": "easy", "category": "health"},
        {"title": "Читать 10 минут", "xp_reward": 30, "icon": "📚", "difficulty": "easy", "category": "study"},
        {"title": "Тренировка 20 минут", "xp_reward": 50, "icon": "🏃", "difficulty": "medium", "category": "health"},
        {"title": "Медитация 5 минут", "xp_reward": 25, "icon": "🧘", "difficulty": "easy", "category": "mind"},
        {"title": "Без соцсетей 1 час", "xp_reward": 40, "icon": "📵", "difficulty": "medium", "category": "mind"},
    ],
    "ja": [
        {"title": "水を8杯飲む", "xp_reward": 20, "icon": "💧", "difficulty": "easy", "category": "health"},
        {"title": "10分読書する", "xp_reward": 30, "icon": "📚", "difficulty": "easy", "category": "study"},
        {"title": "20分運動する", "xp_reward": 50, "icon": "🏃", "difficulty": "medium", "category": "health"},
        {"title": "5分瞑想する", "xp_reward": 25, "icon": "🧘", "difficulty": "easy", "category": "mind"},
        {"title": "SNSを1時間断つ", "xp_reward": 40, "icon": "📵", "difficulty": "medium", "category": "mind"},
    ],
    "ko": [
        {"title": "물 8잔 마시기", "xp_reward": 20, "icon": "💧", "difficulty": "easy", "category": "health"},
        {"title": "10분 독서", "xp_reward": 30, "icon": "📚", "difficulty": "easy", "category": "study"},
        {"title": "20분 운동", "xp_reward": 50, "icon": "🏃", "difficulty": "medium", "category": "health"},
        {"title": "5분 명상", "xp_reward": 25, "icon": "🧘", "difficulty": "easy", "category": "mind"},
        {"title": "1시간 SNS 끊기", "xp_reward": 40, "icon": "📵", "difficulty": "medium", "category": "mind"},
    ],
    "zh": [
        {"title": "喝8杯水", "xp_reward": 20, "icon": "💧", "difficulty": "easy", "category": "health"},
        {"title": "阅读10分钟", "xp_reward": 30, "icon": "📚", "difficulty": "easy", "category": "study"},
        {"title": "运动20分钟", "xp_reward": 50, "icon": "🏃", "difficulty": "medium", "category": "health"},
        {"title": "冥想5分钟", "xp_reward": 25, "icon": "🧘", "difficulty": "easy", "category": "mind"},
        {"title": "停用社交媒体1小时", "xp_reward": 40, "icon": "📵", "difficulty": "medium", "category": "mind"},
    ],
    "ar": [
        {"title": "اشرب 8 أكواب ماء", "xp_reward": 20, "icon": "💧", "difficulty": "easy", "category": "health"},
        {"title": "اقرأ لمدة 10 دقائق", "xp_reward": 30, "icon": "📚", "difficulty": "easy", "category": "study"},
        {"title": "تمرّن 20 دقيقة", "xp_reward": 50, "icon": "🏃", "difficulty": "medium", "category": "health"},
        {"title": "تأمّل 5 دقائق", "xp_reward": 25, "icon": "🧘", "difficulty": "easy", "category": "mind"},
        {"title": "ابتعد عن السوشيال ميديا ساعة", "xp_reward": 40, "icon": "📵", "difficulty": "medium", "category": "mind"},
    ],
    "hi": [
        {"title": "8 गिलास पानी पिएँ", "xp_reward": 20, "icon": "💧", "difficulty": "easy", "category": "health"},
        {"title": "10 मिनट पढ़ें", "xp_reward": 30, "icon": "📚", "difficulty": "easy", "category": "study"},
        {"title": "20 मिनट व्यायाम", "xp_reward": 50, "icon": "🏃", "difficulty": "medium", "category": "health"},
        {"title": "5 मिनट ध्यान", "xp_reward": 25, "icon": "🧘", "difficulty": "easy", "category": "mind"},
        {"title": "1 घंटे सोशल मीडिया से दूर", "xp_reward": 40, "icon": "📵", "difficulty": "medium", "category": "mind"},
    ],
}


def _starter_quests_for(lang: Optional[str]) -> list[dict]:
    if not lang:
        return STARTER_QUESTS_BY_LANG["en"]
    code = lang.lower().split("-")[0].split("_")[0][:2]
    return STARTER_QUESTS_BY_LANG.get(code, STARTER_QUESTS_BY_LANG["en"])


async def _seed_starter_quests(user_id: str, lang: Optional[str]) -> None:
    for q in _starter_quests_for(lang):
        await quests.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": q["title"],
            "xp_reward": q["xp_reward"],
            "icon": q["icon"],
            "difficulty": q["difficulty"],
            "category": q["category"],
            "frequency": "daily",
            "created_at": now_utc().isoformat(),
        })


# ---------- Helpers ----------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(p: str) -> str:
    return pwd_context.hash(p)


def verify_password(p: str, h: str) -> bool:
    return pwd_context.verify(p, h)


def create_access_token(sub: str) -> str:
    expire = now_utc() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": sub, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def xp_needed_for_level(level: int) -> int:
    # RPG curve: 100, 250, 450, 700, 1000, ...
    return 100 + (level - 1) * 150


def total_xp_for_level(level: int) -> int:
    # cumulative xp to reach this level from 1
    return sum(xp_needed_for_level(lv) for lv in range(1, level))


def public_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "username": u["username"],
        "avatar_emoji": u.get("avatar_emoji", "🦄"),
        "level": u.get("level", 1),
        "current_xp": u.get("current_xp", 0),
        "xp_to_next": xp_needed_for_level(u.get("level", 1)),
        "total_xp": u.get("total_xp", 0),
        "streak_count": u.get("streak_count", 0),
        "is_pro": u.get("is_pro", False),
        "xp_boost_until": u.get("xp_boost_until"),
        "created_at": u.get("created_at"),
        "shields": u.get("shields", 0),
        "combo_count": u.get("combo_count", 0),
        "combo_category": u.get("combo_category"),
        "combo_last_at": u.get("combo_last_at"),
        "friend_code": u.get("friend_code"),
        "pet_stage": pet_stage_for_level(u.get("level", 1)),
        "lang": u.get("lang", "en"),
    }


def public_user_lite(u: dict) -> dict:
    """For friend lists / leaderboards. No email."""
    return {
        "id": u["id"],
        "username": u["username"],
        "avatar_emoji": u.get("avatar_emoji", "🦄"),
        "level": u.get("level", 1),
        "total_xp": u.get("total_xp", 0),
        "streak_count": u.get("streak_count", 0),
        "is_pro": u.get("is_pro", False),
        "pet_stage": pet_stage_for_level(u.get("level", 1)),
    }


def pet_stage_for_level(level: int) -> str:
    """Cyberpet evolves with player level."""
    if level >= 30:
        return "ascendant"
    if level >= 20:
        return "mecha"
    if level >= 12:
        return "drone"
    if level >= 6:
        return "larva"
    if level >= 3:
        return "hatchling"
    return "egg"


def generate_friend_code() -> str:
    return "GRYND-" + "".join(secrets.choice("ABCDEFGHJKMNPQRSTUVWXYZ23456789") for _ in range(5))


async def ensure_friend_code(user_id: str) -> str:
    """Lazily allocate a friend_code to users created before the feature shipped."""
    u = await users.find_one({"id": user_id}, {"_id": 0, "friend_code": 1})
    if u and u.get("friend_code"):
        return u["friend_code"]
    # generate a unique one
    for _ in range(8):
        code = generate_friend_code()
        if not await users.find_one({"friend_code": code}, {"_id": 1}):
            await users.update_one({"id": user_id}, {"$set": {"friend_code": code}})
            return code
    raise HTTPException(500, "Could not allocate friend code")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except jwt.InvalidTokenError:
        raise credentials_exception

    user = await users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise credentials_exception
    return user


# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    username: str = Field(min_length=2, max_length=24)
    lang: Optional[str] = Field(default=None, max_length=8)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class QuestIn(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    xp_reward: int = Field(default=25, ge=5, le=200)
    difficulty: Literal["trivial", "easy", "medium", "hard"] = "easy"
    category: str = Field(default="other", max_length=24)
    frequency: Literal["daily", "weekly"] = "daily"
    icon: Optional[str] = "⚡"


class JournalIn(BaseModel):
    content: str = Field(min_length=1, max_length=140)
    mood: str = Field(min_length=1, max_length=8)  # emoji


class CompleteResult(BaseModel):
    xp_gained: int
    leveled_up: bool
    new_level: int
    streak_count: int
    combo: int = 0
    combo_mult: float = 1.0
    combo_bonus_xp: int = 0
    shield_used: bool = False
    shields: int = 0
    user: dict


# ---------- Auth ----------
@auth_router.post("/register", response_model=TokenOut)
async def register(payload: RegisterIn):
    existing = await users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")

    user_id = str(uuid.uuid4())
    new_user = {
        "id": user_id,
        "email": payload.email.lower(),
        "username": payload.username,
        "hashed_password": hash_password(payload.password),
        "avatar_emoji": "🦄",
        "level": 1,
        "current_xp": 0,
        "total_xp": 0,
        "streak_count": 0,
        "last_completed_date": None,
        "is_pro": False,
        "xp_boost_until": None,
        "shields": 0,
        "combo_count": 0,
        "combo_category": None,
        "combo_last_at": None,
        "friend_code": generate_friend_code(),
        "lang": (payload.lang or "en").lower().split("-")[0][:2],
        "created_at": now_utc().isoformat(),
    }
    await users.insert_one(new_user)

    # seed starter quests in user's language (default: English)
    await _seed_starter_quests(user_id, payload.lang)

    token = create_access_token(user_id)
    user_doc = await users.find_one({"id": user_id}, {"_id": 0})
    return {"access_token": token, "user": public_user(user_doc)}


@auth_router.post("/login", response_model=TokenOut)
async def login(payload: LoginIn):
    user = await users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_access_token(user["id"])
    user_clean = await users.find_one({"id": user["id"]}, {"_id": 0})
    return {"access_token": token, "user": public_user(user_clean)}


@auth_router.get("/me")
async def me(current=Depends(get_current_user)):
    return public_user(current)


# ---------- Social auth helpers ----------
EMERGENT_SESSION_API = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


def _slugify_username(raw: str) -> str:
    base = "".join(ch for ch in raw.lower() if ch.isalnum() or ch in ("_",))[:18]
    return base or f"runner{uuid.uuid4().hex[:6]}"


async def _ensure_unique_username(candidate: str) -> str:
    # If exists, append short suffix
    if not await users.find_one({"username": candidate}):
        return candidate
    return f"{candidate}_{uuid.uuid4().hex[:4]}"


async def _upsert_social_user(email: str, display_name: Optional[str], provider: str, lang: Optional[str] = None) -> dict:
    email_norm = email.lower()
    existing = await users.find_one({"email": email_norm}, {"_id": 0})
    if existing:
        return existing

    user_id = str(uuid.uuid4())
    base_username = _slugify_username(display_name or email_norm.split("@")[0])
    username = await _ensure_unique_username(base_username)
    new_user = {
        "id": user_id,
        "email": email_norm,
        "username": username,
        "hashed_password": "",  # social login, no password
        "auth_provider": provider,
        "avatar_emoji": "🦄",
        "level": 1,
        "current_xp": 0,
        "total_xp": 0,
        "streak_count": 0,
        "last_completed_date": None,
        "is_pro": False,
        "xp_boost_until": None,
        "shields": 0,
        "combo_count": 0,
        "combo_category": None,
        "combo_last_at": None,
        "friend_code": generate_friend_code(),
        "lang": (lang or "en").lower().split("-")[0][:2],
        "created_at": now_utc().isoformat(),
    }
    await users.insert_one(new_user)

    # social-auth: seed starter quests in user's language
    await _seed_starter_quests(user_id, lang)

    return await users.find_one({"id": user_id}, {"_id": 0})


class GoogleAuthIn(BaseModel):
    session_id: str = Field(min_length=4, max_length=512)
    lang: Optional[str] = Field(default=None, max_length=8)


@auth_router.post("/google", response_model=TokenOut)
async def google_auth(payload: GoogleAuthIn):
    # Fetch the Google profile from Emergent's session-data endpoint
    try:
        async with httpx.AsyncClient(timeout=10.0) as client_http:
            r = await client_http.get(
                EMERGENT_SESSION_API,
                headers={"X-Session-ID": payload.session_id},
            )
    except httpx.HTTPError as e:
        logger.exception("google session fetch failed: %s", e)
        raise HTTPException(502, "Could not reach auth provider")

    if r.status_code != 200:
        raise HTTPException(401, "Invalid Google session")
    data = r.json()
    email = data.get("email")
    if not email:
        raise HTTPException(401, "No email returned from Google")
    name = data.get("name") or email.split("@")[0]

    user = await _upsert_social_user(email, name, provider="google", lang=payload.lang)
    token = create_access_token(user["id"])
    return {"access_token": token, "user": public_user(user)}


class AppleAuthIn(BaseModel):
    identity_token: str = Field(min_length=8, max_length=4096)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    lang: Optional[str] = Field(default=None, max_length=8)


def _decode_apple_token(token: str) -> dict:
    # Apple identity_token is a JWS. For MVP we decode the payload without
    # signature verification — sufficient to extract `sub` and `email`.
    # Production would verify against https://appleid.apple.com/auth/keys.
    try:
        unverified = jwt.decode(token, options={"verify_signature": False})
        return unverified
    except Exception as e:
        logger.warning("apple token decode failed: %s", e)
        raise HTTPException(401, "Invalid Apple identity token")


@auth_router.post("/apple", response_model=TokenOut)
async def apple_auth(payload: AppleAuthIn):
    claims = _decode_apple_token(payload.identity_token)
    # Apple only sends email on FIRST sign-in. Client can also pass it from
    # the credential they received.
    email = (payload.email or claims.get("email") or "").lower()
    sub = claims.get("sub")
    if not email and sub:
        # Apple private-relay anonymous email — synthesize stable handle
        email = f"{sub}@privaterelay.appleid.com"
    if not email:
        raise HTTPException(401, "No email available from Apple credential")

    user = await _upsert_social_user(email, payload.full_name or email.split("@")[0], provider="apple", lang=payload.lang)
    token = create_access_token(user["id"])
    return {"access_token": token, "user": public_user(user)}


# ---------- Quests ----------
@quest_router.get("")
async def list_quests(current=Depends(get_current_user)):
    cursor = quests.find({"user_id": current["id"]}, {"_id": 0}).sort("created_at", 1)
    quest_list = await cursor.to_list(200)

    # determine which quests are already completed today
    today = now_utc().date().isoformat()
    logs = await quest_logs.find(
        {"user_id": current["id"], "completed_date": today}, {"_id": 0}
    ).to_list(200)
    completed_ids = {log["quest_id"] for log in logs}

    for q in quest_list:
        q["completed_today"] = q["id"] in completed_ids
    return quest_list


@quest_router.post("")
async def create_quest(payload: QuestIn, current=Depends(get_current_user)):
    quest = {
        "id": str(uuid.uuid4()),
        "user_id": current["id"],
        "title": payload.title,
        "xp_reward": payload.xp_reward,
        "difficulty": payload.difficulty,
        "category": payload.category,
        "frequency": payload.frequency,
        "icon": payload.icon or "⚡",
        "created_at": now_utc().isoformat(),
    }
    await quests.insert_one(quest)
    quest.pop("_id", None)
    quest["completed_today"] = False
    return quest


@quest_router.post("/{quest_id}/uncomplete")
async def uncomplete_quest(quest_id: str, current=Depends(get_current_user)):
    """Undo a completion done today. Refunds XP and reverts level/streak appropriately."""
    today = now_utc().date().isoformat()
    log = await quest_logs.find_one(
        {"user_id": current["id"], "quest_id": quest_id, "completed_date": today}
    )
    if not log:
        raise HTTPException(404, "Not completed today")
    xp_refund = int(log.get("xp_gained", 0))
    await quest_logs.delete_one({"id": log["id"]})

    # Refund XP / drop levels if necessary
    new_current = current.get("current_xp", 0)
    total_xp = max(0, current.get("total_xp", 0) - xp_refund)
    level = current.get("level", 1)
    new_current -= xp_refund
    while new_current < 0 and level > 1:
        level -= 1
        new_current += xp_needed_for_level(level)
    if new_current < 0:
        new_current = 0

    # If no completions left today, restore streak to previous state (best-effort)
    today_completions = await quest_logs.count_documents(
        {"user_id": current["id"], "completed_date": today}
    )
    streak = current.get("streak_count", 0)
    last_date = current.get("last_completed_date")
    if today_completions == 0 and last_date == today:
        # try to find prior day's last_completed_date
        prior_log = await quest_logs.find_one(
            {"user_id": current["id"], "completed_date": {"$lt": today}},
            sort=[("completed_date", -1)],
        )
        if prior_log:
            last_date = prior_log["completed_date"]
            # streak decrement by 1 (today was incremented)
            streak = max(0, streak - 1)
        else:
            last_date = None
            streak = 0

    await users.update_one(
        {"id": current["id"]},
        {"$set": {
            "current_xp": new_current,
            "total_xp": total_xp,
            "level": level,
            "streak_count": streak,
            "last_completed_date": last_date,
        }},
    )
    updated = await users.find_one({"id": current["id"]}, {"_id": 0})
    return {"xp_refunded": xp_refund, "user": public_user(updated)}


@quest_router.delete("/{quest_id}")
async def delete_quest(quest_id: str, current=Depends(get_current_user)):
    res = await quests.delete_one({"id": quest_id, "user_id": current["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Quest not found")
    return {"ok": True}


@quest_router.post("/{quest_id}/complete", response_model=CompleteResult)
async def complete_quest(quest_id: str, current=Depends(get_current_user)):
    quest = await quests.find_one({"id": quest_id, "user_id": current["id"]}, {"_id": 0})
    if not quest:
        raise HTTPException(404, "Quest not found")

    today = now_utc().date().isoformat()
    already = await quest_logs.find_one(
        {"user_id": current["id"], "quest_id": quest_id, "completed_date": today}
    )
    if already:
        raise HTTPException(400, "Already completed today")

    # XP gain with possible 2x boost
    base_xp = quest["xp_reward"]
    xp_gain = base_xp
    boost_until_raw = current.get("xp_boost_until")
    if boost_until_raw:
        try:
            boost_until = datetime.fromisoformat(boost_until_raw)
            if boost_until > now_utc():
                xp_gain *= 2
        except Exception:
            pass

    # ---- Combo multiplier ----
    # Chain of same-category completions within 10 minutes → 1.25× / 1.5× / 2× / 3× (RAGE MODE)
    category = quest.get("category", "other")
    now = now_utc()
    last_at_raw = current.get("combo_last_at")
    last_cat = current.get("combo_category")
    combo = int(current.get("combo_count", 0))
    if last_at_raw and last_cat == category:
        try:
            last_at = datetime.fromisoformat(last_at_raw)
            if (now - last_at).total_seconds() <= 600:
                combo += 1
            else:
                combo = 1
        except Exception:
            combo = 1
    else:
        combo = 1
    combo_mult = 1.0
    if combo == 2:
        combo_mult = 1.25
    elif combo == 3:
        combo_mult = 1.5
    elif combo == 4:
        combo_mult = 2.0
    elif combo >= 5:
        combo_mult = 3.0  # RAGE MODE
    combo_bonus_xp = int(xp_gain * (combo_mult - 1))
    xp_gain += combo_bonus_xp

    # Log completion
    await quest_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": current["id"],
        "quest_id": quest_id,
        "xp_gained": xp_gain,
        "combo": combo,
        "combo_mult": combo_mult,
        "completed_date": today,
        "completed_at": now.isoformat(),
    })

    # ---- Streak with shield protection ----
    last_date_str = current.get("last_completed_date")
    streak = int(current.get("streak_count", 0))
    shields = int(current.get("shields", 0))
    shield_used = False
    if last_date_str != today:
        if last_date_str:
            try:
                last_date = date.fromisoformat(last_date_str)
                delta = (now.date() - last_date).days
                if delta == 1:
                    streak += 1
                elif delta > 1:
                    # Streak about to reset. Try to spend a shield.
                    missed = delta - 1
                    if shields >= missed:
                        shields -= missed
                        streak += 1
                        shield_used = True
                    else:
                        streak = 1
            except Exception:
                streak = 1
        else:
            streak = 1
    # Award a shield every 7th streak day (one-time at each crossing)
    prev_streak = int(current.get("streak_count", 0))
    if streak > prev_streak and streak > 0 and streak % 7 == 0 and shields < 3:
        shields += 1  # max 3 shields stockpile

    # XP / level math
    new_current = int(current.get("current_xp", 0)) + xp_gain
    level = int(current.get("level", 1))
    total_xp = int(current.get("total_xp", 0)) + xp_gain
    leveled_up = False
    while new_current >= xp_needed_for_level(level):
        new_current -= xp_needed_for_level(level)
        level += 1
        leveled_up = True

    await users.update_one(
        {"id": current["id"]},
        {"$set": {
            "current_xp": new_current,
            "total_xp": total_xp,
            "level": level,
            "streak_count": streak,
            "last_completed_date": today,
            "shields": shields,
            "combo_count": combo,
            "combo_category": category,
            "combo_last_at": now.isoformat(),
        }},
    )

    updated = await users.find_one({"id": current["id"]}, {"_id": 0})
    return {
        "xp_gained": xp_gain,
        "leveled_up": leveled_up,
        "new_level": level,
        "streak_count": streak,
        "combo": combo,
        "combo_mult": combo_mult,
        "combo_bonus_xp": combo_bonus_xp,
        "shield_used": shield_used,
        "shields": shields,
        "user": public_user(updated),
    }


# ---------- Journals ----------
@journal_router.get("")
async def list_journals(current=Depends(get_current_user)):
    cursor = journals.find({"user_id": current["id"]}, {"_id": 0}).sort("created_at", -1)
    return await cursor.to_list(200)


@journal_router.post("")
async def create_journal(payload: JournalIn, current=Depends(get_current_user)):
    entry = {
        "id": str(uuid.uuid4()),
        "user_id": current["id"],
        "content": payload.content,
        "mood": payload.mood,
        "created_at": now_utc().isoformat(),
    }
    await journals.insert_one(entry)
    entry.pop("_id", None)
    return entry


@journal_router.delete("/{journal_id}")
async def delete_journal(journal_id: str, current=Depends(get_current_user)):
    res = await journals.delete_one({"id": journal_id, "user_id": current["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Journal not found")
    return {"ok": True}


# ---------- Leaderboard ----------
@board_router.get("")
async def leaderboard(current=Depends(get_current_user)):
    cursor = users.find({}, {"_id": 0}).sort([("total_xp", -1), ("level", -1)]).limit(50)
    top = await cursor.to_list(50)
    ranked = []
    for idx, u in enumerate(top, start=1):
        ranked.append({
            "rank": idx,
            "id": u["id"],
            "username": u["username"],
            "avatar_emoji": u.get("avatar_emoji", "🦄"),
            "level": u.get("level", 1),
            "total_xp": u.get("total_xp", 0),
            "is_pro": u.get("is_pro", False),
            "is_me": u["id"] == current["id"],
        })

    me_rank = next((r for r in ranked if r["is_me"]), None)
    if not me_rank:
        # compute my rank manually
        higher = await users.count_documents({"total_xp": {"$gt": current.get("total_xp", 0)}})
        me_rank = {
            "rank": higher + 1,
            "id": current["id"],
            "username": current["username"],
            "avatar_emoji": current.get("avatar_emoji", "🦄"),
            "level": current.get("level", 1),
            "total_xp": current.get("total_xp", 0),
            "is_pro": current.get("is_pro", False),
            "is_me": True,
        }
    return {"top": ranked, "me": me_rank}


# ---------- Monetization ----------
@monet_router.post("/xp-boost")
async def activate_xp_boost(current=Depends(get_current_user)):
    # 2x XP for 1 hour after watching rewarded ad (mocked)
    until = now_utc() + timedelta(hours=1)
    await users.update_one(
        {"id": current["id"]},
        {"$set": {"xp_boost_until": until.isoformat()}},
    )
    updated = await users.find_one({"id": current["id"]}, {"_id": 0})
    return {"xp_boost_until": until.isoformat(), "user": public_user(updated)}


@monet_router.post("/pro/activate")
async def activate_pro(current=Depends(get_current_user)):
    # Mock QRIS payment confirmation
    await users.update_one(
        {"id": current["id"]},
        {"$set": {"is_pro": True, "avatar_emoji": "👾"}},
    )
    updated = await users.find_one({"id": current["id"]}, {"_id": 0})
    return {"ok": True, "user": public_user(updated)}


@monet_router.get("/qris")
async def qris_payment_info(current=Depends(get_current_user)):
    # Mock QRIS payload — in real life would call Midtrans/Xendit
    payload = (
        f"00020101021126570011ID.CYBERCHILL01189360091400123456780215CYBERCHILLPRO{current['id'][:8]}"
        f"5204481253033605802ID5910CyberChill6007Jakarta61051234062070703A0163041234"
    )
    return {
        "qris_string": payload,
        "amount_idr": 49000,
        "merchant": "GRYND Guild",
        "label": "Guild Pro Lifetime",
        "expires_in": 600,
    }


# ---------- Profile updates ----------
class ProfileUpdateIn(BaseModel):
    username: Optional[str] = Field(default=None, min_length=2, max_length=24)
    avatar_emoji: Optional[str] = Field(default=None, min_length=1, max_length=8)


@auth_router.patch("/me")
async def update_me(payload: ProfileUpdateIn, current=Depends(get_current_user)):
    update = {k: v for k, v in payload.dict().items() if v is not None}
    if update:
        await users.update_one({"id": current["id"]}, {"$set": update})
    updated = await users.find_one({"id": current["id"]}, {"_id": 0})
    return public_user(updated)


# ---------- AI Quest Coach ----------
class AICoachIn(BaseModel):
    goal: str = Field(min_length=4, max_length=240)
    lang: Optional[str] = Field(default=None, max_length=8)


def _strip_json_fences(s: str) -> str:
    s = s.strip()
    s = re.sub(r"^```(?:json)?", "", s).strip()
    s = re.sub(r"```$", "", s).strip()
    return s


@ai_router.post("/coach")
async def ai_coach(payload: AICoachIn, current=Depends(get_current_user)):
    """Take a user's goal and return 5 daily-quest suggestions in their language."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "AI coach unavailable (key missing)")

    lang_code = (payload.lang or current.get("lang") or "en").lower().split("-")[0][:2]
    LANG_NAMES = {
        "en": "English", "id": "Bahasa Indonesia", "es": "Spanish", "fr": "French",
        "de": "German", "pt": "Portuguese", "ru": "Russian", "ja": "Japanese",
        "ko": "Korean", "zh": "Simplified Chinese", "ar": "Arabic", "hi": "Hindi",
    }
    lang_name = LANG_NAMES.get(lang_code, "English")

    system = (
        "You are GRYND's habit-coach AI. Given the user's goal, output EXACTLY 5 daily, "
        "specific, beginner-friendly quests that compound towards the goal. Output VALID JSON ONLY "
        "(no markdown). Schema: an array of 5 objects with keys: title (string, <=60 chars), "
        "icon (single emoji), difficulty ('trivial'|'easy'|'medium'|'hard'), category "
        "('morning'|'health'|'mind'|'study'|'social'|'creative'|'other'), xp_reward "
        "(integer in {10,20,40,75} matching difficulty)."
    )
    prompt = (
        f"Goal: \"{payload.goal}\"\n"
        f"Write all titles in {lang_name}. Be concrete (numbers, durations). No commentary, JSON only."
    )

    from emergentintegrations.llm.chat import LlmChat, UserMessage  # imported lazily
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"coach-{current['id']}-{uuid.uuid4().hex[:6]}",
        system_message=system,
    ).with_model("gemini", "gemini-3-flash-preview")

    try:
        raw = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.exception("ai coach failure: %s", e)
        raise HTTPException(502, "AI coach failed, try again")

    raw_text = raw if isinstance(raw, str) else getattr(raw, "content", str(raw))
    clean = _strip_json_fences(raw_text)
    try:
        parsed = json.loads(clean)
        if not isinstance(parsed, list):
            raise ValueError("not a list")
    except Exception:
        # very defensive: try to find first JSON array in the string
        m = re.search(r"\[\s*\{.*?\}\s*\]", clean, flags=re.S)
        if not m:
            raise HTTPException(502, "Could not parse AI response")
        parsed = json.loads(m.group(0))

    # sanitize + normalize
    XP_BY_DIFF = {"trivial": 10, "easy": 20, "medium": 40, "hard": 75}
    cats = {"morning", "health", "mind", "study", "social", "creative", "other"}
    diffs = {"trivial", "easy", "medium", "hard"}
    suggestions = []
    for item in parsed[:5]:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title", "")).strip()[:80] or "New quest"
        icon = str(item.get("icon", "⚡")).strip() or "⚡"
        diff = str(item.get("difficulty", "easy")).lower()
        if diff not in diffs:
            diff = "easy"
        cat = str(item.get("category", "other")).lower()
        if cat not in cats:
            cat = "other"
        xp = XP_BY_DIFF[diff]
        suggestions.append({
            "title": title, "icon": icon, "difficulty": diff,
            "category": cat, "xp_reward": xp,
        })
    if not suggestions:
        raise HTTPException(502, "AI returned no usable quests")
    return {"goal": payload.goal, "suggestions": suggestions, "lang": lang_code}


class AIAcceptIn(BaseModel):
    quests: List[QuestIn]


@ai_router.post("/accept")
async def ai_accept(payload: AIAcceptIn, current=Depends(get_current_user)):
    """Persist quests returned by /ai/coach that the user has chosen to keep."""
    inserted = []
    for q in payload.quests:
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": current["id"],
            "title": q.title,
            "xp_reward": q.xp_reward,
            "difficulty": q.difficulty,
            "category": q.category,
            "frequency": q.frequency,
            "icon": q.icon or "⚡",
            "ai_generated": True,
            "created_at": now_utc().isoformat(),
        }
        await quests.insert_one(doc)
        doc.pop("_id", None)
        doc["completed_today"] = False
        inserted.append(doc)
    return {"created": inserted}


# ---------- Friends ----------
class FriendAddIn(BaseModel):
    friend_code: str = Field(min_length=4, max_length=24)


@social_router.get("/me")
async def social_me(current=Depends(get_current_user)):
    code = current.get("friend_code") or await ensure_friend_code(current["id"])
    refreshed = await users.find_one({"id": current["id"]}, {"_id": 0})
    return {"friend_code": code, "user": public_user(refreshed)}


@social_router.post("/friend/add")
async def friend_add(payload: FriendAddIn, current=Depends(get_current_user)):
    code = payload.friend_code.strip().upper()
    if not code.startswith("GRYND-"):
        # accept just the suffix as well
        code = "GRYND-" + code.lstrip("GRYND-").lstrip("-")
    target = await users.find_one({"friend_code": code}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Friend code not found")
    if target["id"] == current["id"]:
        raise HTTPException(400, "That's you!")
    pair_key = "::".join(sorted([current["id"], target["id"]]))
    exists = await friendships.find_one({"pair_key": pair_key})
    if exists:
        return {"status": "already_friends", "friend": public_user_lite(target)}
    await friendships.insert_one({
        "id": str(uuid.uuid4()),
        "pair_key": pair_key,
        "a_id": current["id"],
        "b_id": target["id"],
        "created_at": now_utc().isoformat(),
    })
    return {"status": "added", "friend": public_user_lite(target)}


@social_router.get("/friends")
async def list_friends(current=Depends(get_current_user)):
    cursor = friendships.find(
        {"$or": [{"a_id": current["id"]}, {"b_id": current["id"]}]},
        {"_id": 0},
    )
    pairs = await cursor.to_list(500)
    ids = [p["b_id"] if p["a_id"] == current["id"] else p["a_id"] for p in pairs]
    if not ids:
        return {"friends": []}
    cursor2 = users.find({"id": {"$in": ids}}, {"_id": 0})
    arr = await cursor2.to_list(500)
    arr.sort(key=lambda u: (-u.get("total_xp", 0), -u.get("level", 1)))
    return {"friends": [public_user_lite(u) for u in arr]}


@social_router.delete("/friend/{friend_id}")
async def friend_remove(friend_id: str, current=Depends(get_current_user)):
    pair_key = "::".join(sorted([current["id"], friend_id]))
    res = await friendships.delete_one({"pair_key": pair_key})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not friends")
    return {"ok": True}


class HighFiveIn(BaseModel):
    to_user_id: str = Field(min_length=4)


@social_router.post("/high-five")
async def high_five(payload: HighFiveIn, current=Depends(get_current_user)):
    pair_key = "::".join(sorted([current["id"], payload.to_user_id]))
    is_friend = await friendships.find_one({"pair_key": pair_key})
    if not is_friend:
        raise HTTPException(403, "Only friends can high-five")
    today = now_utc().date().isoformat()
    already = await high_fives.find_one({
        "from_id": current["id"], "to_id": payload.to_user_id, "date": today,
    })
    if already:
        return {"status": "already"}
    await high_fives.insert_one({
        "id": str(uuid.uuid4()),
        "from_id": current["id"],
        "to_id": payload.to_user_id,
        "date": today,
        "created_at": now_utc().isoformat(),
    })
    # tiny morale XP for the recipient
    await users.update_one({"id": payload.to_user_id}, {"$inc": {"total_xp": 5, "current_xp": 5}})
    return {"status": "sent"}


@board_router.get("/friends")
async def leaderboard_friends(current=Depends(get_current_user)):
    """Friends-only leaderboard, including the user."""
    cursor = friendships.find(
        {"$or": [{"a_id": current["id"]}, {"b_id": current["id"]}]},
        {"_id": 0},
    )
    pairs = await cursor.to_list(500)
    ids = [p["b_id"] if p["a_id"] == current["id"] else p["a_id"] for p in pairs]
    ids.append(current["id"])
    cursor2 = users.find({"id": {"$in": ids}}, {"_id": 0}).sort(
        [("total_xp", -1), ("level", -1)]
    )
    arr = await cursor2.to_list(500)
    out = []
    for idx, u in enumerate(arr, start=1):
        row = public_user_lite(u)
        row["rank"] = idx
        row["is_me"] = u["id"] == current["id"]
        out.append(row)
    return {"top": out}


# ---------- Push notifications ----------
class PushRegisterIn(BaseModel):
    token: str = Field(min_length=4, max_length=200)
    platform: Literal["ios", "android", "web"] = "web"


@push_router.post("/register")
async def push_register(payload: PushRegisterIn, current=Depends(get_current_user)):
    await push_tokens.update_one(
        {"user_id": current["id"], "token": payload.token},
        {"$set": {
            "user_id": current["id"],
            "token": payload.token,
            "platform": payload.platform,
            "updated_at": now_utc().isoformat(),
        }},
        upsert=True,
    )
    return {"ok": True}


@push_router.delete("/unregister")
async def push_unregister(current=Depends(get_current_user)):
    await push_tokens.delete_many({"user_id": current["id"]})
    return {"ok": True}


# ---------- Public profile + Open Graph ----------
@profile_router.get("/{username}", response_class=HTMLResponse)
async def public_profile_html(username: str):
    """Returns an HTML page with proper OG meta tags so Twitter/FB/WhatsApp
    unfurl a beautiful preview when a user shares their profile link."""
    u = await users.find_one({"username": username}, {"_id": 0})
    if not u:
        return HTMLResponse(_og_html("GRYND", "User not found", "@unknown"), status_code=404)
    title = f"@{u['username']} on GRYND — Lvl {u.get('level',1)}"
    desc = (
        f"{u.get('total_xp',0):,} XP · {u.get('streak_count',0)}-day streak · "
        f"Habit-runner on GRYND. Join my guild!"
    )
    avatar = u.get("avatar_emoji", "🦄")  # noqa: F841 (kept for future SVG embed)
    site_url = os.environ.get("APP_URL", "https://grynd.app")
    og_image = f"{site_url}/api/og/{u['username']}.svg"
    return HTMLResponse(_og_html(title, desc, f"@{u['username']}", og_image, site_url))


def _og_html(title: str, desc: str, handle: str, image_url: str = "", site: str = "https://grynd.app") -> str:
    image_tag = f'<meta property="og:image" content="{image_url}" /><meta name="twitter:image" content="{image_url}" />' if image_url else ""
    return f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title}</title>
<meta name="description" content="{desc}" />
<meta property="og:type" content="profile" />
<meta property="og:site_name" content="GRYND" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{desc}" />
<meta property="og:url" content="{site}/u/{handle.lstrip('@')}" />
{image_tag}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{title}" />
<meta name="twitter:description" content="{desc}" />
<style>
body {{ background:#000;color:#fff;font-family:system-ui;text-align:center;padding:60px 20px;margin:0; }}
.wrap {{ max-width:600px;margin:0 auto; }}
.brand {{ display:inline-block;background:#00E5FF;color:#000;padding:6px 14px;border-radius:999px;font-weight:900;letter-spacing:3px;font-size:14px; }}
h1 {{ font-size:36px;margin:24px 0 8px;font-weight:900;letter-spacing:-1px; }}
.desc {{ color:#A1A1AA;font-size:16px;line-height:1.5; }}
.cta {{ display:inline-block;margin-top:32px;background:#00E5FF;color:#000;padding:14px 28px;border-radius:999px;font-weight:900;text-decoration:none;letter-spacing:1px; }}
.handle {{ color:#39FF14;margin-top:16px;font-weight:800; }}
</style>
</head><body><div class="wrap">
<span class="brand">GRYND</span>
<h1>{title}</h1>
<p class="handle">{handle}</p>
<p class="desc">{desc}</p>
<a class="cta" href="{site}/">Open the app →</a>
</div></body></html>"""


@api.get("/og/{username}.svg")
async def og_image_svg(username: str):
    """Inline SVG OG image (1200x630) so social previews show a branded card."""
    u = await users.find_one({"username": username}, {"_id": 0})
    if not u:
        u = {"username": username, "level": 1, "total_xp": 0, "streak_count": 0, "avatar_emoji": "👻"}
    svg = _og_svg(u)
    from fastapi.responses import Response
    return Response(content=svg, media_type="image/svg+xml",
                    headers={"Cache-Control": "public, max-age=300"})


def _og_svg(u: dict) -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#000000"/>
      <stop offset="100%" stop-color="#0A0A0A"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#00E5FF" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#00E5FF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif">
    <rect x="60" y="60" rx="28" ry="28" width="130" height="44" fill="#00E5FF"/>
    <text x="125" y="91" font-size="22" font-weight="900" fill="#000" text-anchor="middle" letter-spacing="6">GRYND</text>
    <text x="60" y="200" font-size="48" font-weight="900" fill="#A1A1AA" letter-spacing="6">LEVEL</text>
    <text x="60" y="320" font-size="200" font-weight="900" fill="#00E5FF" letter-spacing="-6">{u.get('level',1)}</text>
    <text x="60" y="430" font-size="44" font-weight="800" fill="#FFFFFF">@{u['username']}</text>
    <text x="60" y="490" font-size="28" fill="#A1A1AA">{u.get('total_xp',0):,} XP · {u.get('streak_count',0)}-day streak</text>
    <text x="1130" y="540" font-size="220" text-anchor="end">{u.get('avatar_emoji','🦄')}</text>
    <text x="60" y="555" font-size="22" fill="#39FF14" letter-spacing="3">HABITS → XP · LEVEL UP IRL</text>
  </g>
</svg>"""


# ---------- Healthcheck ----------
@api.get("/")
async def root():
    return {"ok": True, "service": "grynd"}


# Register routers
api.include_router(auth_router)
api.include_router(quest_router)
api.include_router(journal_router)
api.include_router(board_router)
api.include_router(monet_router)
api.include_router(ai_router)
api.include_router(social_router)
api.include_router(push_router)
api.include_router(profile_router)  # public /api/u/{username}
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
