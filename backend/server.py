import os
import uuid
import logging
from datetime import datetime, timedelta, timezone, date
from pathlib import Path
from typing import List, Optional, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from passlib.context import CryptContext
import jwt


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
SECRET_KEY = os.environ["JWT_SECRET"]
ALGORITHM = os.environ["JWT_ALGORITHM"]
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
users = db.users
quests = db.quests
quest_logs = db.quest_logs
journals = db.journals

app = FastAPI(title="Cyber-Chill API")
api = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["auth"])
quest_router = APIRouter(prefix="/quests", tags=["quests"])
journal_router = APIRouter(prefix="/journals", tags=["journals"])
board_router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])
monet_router = APIRouter(prefix="/monetization", tags=["monetization"])

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cyberchill")


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
    }


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
        "created_at": now_utc().isoformat(),
    }
    await users.insert_one(new_user)

    # seed a few starter quests
    starter = [
        {"title": "Hydrate (8 glasses)", "xp_reward": 20, "icon": "💧"},
        {"title": "Read 10 minutes", "xp_reward": 30, "icon": "📚"},
        {"title": "Move your body", "xp_reward": 40, "icon": "🏃"},
        {"title": "No social media 1hr", "xp_reward": 50, "icon": "🧘"},
    ]
    for q in starter:
        await quests.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": q["title"],
            "xp_reward": q["xp_reward"],
            "icon": q["icon"],
            "frequency": "daily",
            "created_at": now_utc().isoformat(),
        })

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
        "frequency": payload.frequency,
        "icon": payload.icon or "⚡",
        "created_at": now_utc().isoformat(),
    }
    await quests.insert_one(quest)
    quest.pop("_id", None)
    quest["completed_today"] = False
    return quest


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
    xp_gain = quest["xp_reward"]
    boost_until_raw = current.get("xp_boost_until")
    if boost_until_raw:
        try:
            boost_until = datetime.fromisoformat(boost_until_raw)
            if boost_until > now_utc():
                xp_gain *= 2
        except Exception:
            pass

    # Log completion
    await quest_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": current["id"],
        "quest_id": quest_id,
        "xp_gained": xp_gain,
        "completed_date": today,
        "completed_at": now_utc().isoformat(),
    })

    # Update streak
    last_date_str = current.get("last_completed_date")
    streak = current.get("streak_count", 0)
    if last_date_str != today:
        if last_date_str:
            try:
                last_date = date.fromisoformat(last_date_str)
                delta = (now_utc().date() - last_date).days
                if delta == 1:
                    streak += 1
                elif delta > 1:
                    streak = 1
            except Exception:
                streak = 1
        else:
            streak = 1

    # XP / level math
    new_current = current.get("current_xp", 0) + xp_gain
    level = current.get("level", 1)
    total_xp = current.get("total_xp", 0) + xp_gain
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
        }},
    )

    updated = await users.find_one({"id": current["id"]}, {"_id": 0})
    return {
        "xp_gained": xp_gain,
        "leveled_up": leveled_up,
        "new_level": level,
        "streak_count": streak,
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
        "merchant": "Cyber-Chill Guild",
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


# ---------- Healthcheck ----------
@api.get("/")
async def root():
    return {"ok": True, "service": "cyber-chill"}


# Register routers
api.include_router(auth_router)
api.include_router(quest_router)
api.include_router(journal_router)
api.include_router(board_router)
api.include_router(monet_router)
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
