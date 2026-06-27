"""GRYND backend API tests — covers all endpoints listed in review request iteration_3."""
import os
import uuid
import pytest
import requests

BASE_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or os.environ.get("REACT_APP_BACKEND_URL")
).rstrip("/")
API = f"{BASE_URL}/api"

SEED_EMAIL = "tester@grynd.app"
SEED_PASSWORD = "Tester123!"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def fresh_user(session):
    email = f"TEST_grynd_{uuid.uuid4().hex[:8]}@grynd.example"
    username = f"TST{uuid.uuid4().hex[:5]}"
    payload = {"email": email, "password": "Password123!", "username": username}
    r = session.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    return {
        "token": data["access_token"],
        "user": data["user"],
        "email": email,
        "password": "Password123!",
        "username": username,
    }


@pytest.fixture(scope="session")
def seed_user(session):
    """Seeded test account from /app/memory/test_credentials.md."""
    r = session.post(f"{API}/auth/login", json={"email": SEED_EMAIL, "password": SEED_PASSWORD})
    if r.status_code != 200:
        # auto-create if missing
        session.post(
            f"{API}/auth/register",
            json={"email": SEED_EMAIL, "password": SEED_PASSWORD, "username": "tester"},
        )
        r = session.post(f"{API}/auth/login", json={"email": SEED_EMAIL, "password": SEED_PASSWORD})
    assert r.status_code == 200, f"seed login failed: {r.status_code} {r.text}"
    d = r.json()
    return {"token": d["access_token"], "user": d["user"]}


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Health ----------
class TestHealth:
    def test_root_returns_ok_and_grynd(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        body = r.json()
        assert body.get("ok") is True
        assert body.get("service") == "grynd"


# ---------- Auth ----------
class TestAuth:
    def test_register_returns_jwt_and_seeds_quests(self, session, fresh_user):
        assert fresh_user["token"]
        user = fresh_user["user"]
        assert user["level"] == 1
        assert user["total_xp"] == 0
        assert user["current_xp"] == 0
        assert user["is_pro"] is False
        assert user["email"] == fresh_user["email"].lower()
        # 5 starter quests seeded per server.py
        r = session.get(f"{API}/quests", headers=auth(fresh_user["token"]))
        assert r.status_code == 200
        quest_list = r.json()
        assert len(quest_list) == 5, f"expected 5 starter quests, got {len(quest_list)}"

    def test_login_with_seeded_account(self, session, seed_user):
        assert seed_user["token"]
        assert seed_user["user"]["email"] == SEED_EMAIL

    def test_login_invalid(self, session):
        r = session.post(
            f"{API}/auth/login",
            json={"email": "nobody@nowhere.io", "password": "wrong"},
        )
        assert r.status_code == 401

    def test_me_with_token(self, session, fresh_user):
        r = session.get(f"{API}/auth/me", headers=auth(fresh_user["token"]))
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == fresh_user["email"].lower()
        assert "_id" not in body
        assert "hashed_password" not in body

    def test_me_without_token(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_patch_me_updates_username_and_avatar(self, session, fresh_user):
        new_name = f"NM{uuid.uuid4().hex[:5]}"
        r = session.patch(
            f"{API}/auth/me",
            json={"avatar_emoji": "🛸", "username": new_name},
            headers=auth(fresh_user["token"]),
        )
        assert r.status_code == 200
        body = r.json()
        assert body["avatar_emoji"] == "🛸"
        assert body["username"] == new_name
        # Verify persistence via GET
        rv = session.get(f"{API}/auth/me", headers=auth(fresh_user["token"]))
        assert rv.json()["username"] == new_name
        assert rv.json()["avatar_emoji"] == "🛸"


# ---------- Quests ----------
class TestQuests:
    def test_list_starter_quests(self, session, fresh_user):
        r = session.get(f"{API}/quests", headers=auth(fresh_user["token"]))
        assert r.status_code == 200
        quest_list = r.json()
        assert len(quest_list) == 5
        for q in quest_list:
            assert "completed_today" in q
            assert "_id" not in q
            assert "id" in q and "title" in q and "xp_reward" in q

    def test_create_quest_with_medium_and_other(self, session, fresh_user):
        payload = {
            "title": "TEST_custom_quest",
            "xp_reward": 35,
            "icon": "🎯",
            "difficulty": "medium",
            "category": "other",
        }
        r = session.post(f"{API}/quests", json=payload, headers=auth(fresh_user["token"]))
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["title"] == payload["title"]
        assert body["xp_reward"] == 35
        assert body["difficulty"] == "medium"
        assert body["category"] == "other"
        assert body["icon"] == "🎯"
        assert body["completed_today"] is False
        # Verify via GET
        r2 = session.get(f"{API}/quests", headers=auth(fresh_user["token"]))
        assert any(q["id"] == body["id"] for q in r2.json())

    def test_complete_returns_xp_level_streak(self, session, fresh_user):
        # find an uncompleted quest
        ql = session.get(f"{API}/quests", headers=auth(fresh_user["token"])).json()
        target = next(q for q in ql if not q.get("completed_today"))
        before = session.get(f"{API}/auth/me", headers=auth(fresh_user["token"])).json()
        rc = session.post(
            f"{API}/quests/{target['id']}/complete",
            headers=auth(fresh_user["token"]),
        )
        assert rc.status_code == 200, rc.text
        result = rc.json()
        # response shape
        for key in ("xp_gained", "leveled_up", "new_level", "streak_count", "user"):
            assert key in result, f"missing key {key}"
        assert result["xp_gained"] == target["xp_reward"]
        assert result["streak_count"] >= 1
        assert result["user"]["total_xp"] == before["total_xp"] + target["xp_reward"]

    def test_complete_twice_same_day_returns_400(self, session, fresh_user):
        # the quest completed above is already done — find it
        ql = session.get(f"{API}/quests", headers=auth(fresh_user["token"])).json()
        completed = next((q for q in ql if q.get("completed_today")), None)
        assert completed is not None, "need a completed quest"
        rc = session.post(
            f"{API}/quests/{completed['id']}/complete",
            headers=auth(fresh_user["token"]),
        )
        assert rc.status_code == 400

    def test_uncomplete_refunds_xp(self, session, fresh_user):
        # create a fresh user for clean XP math
        email = f"TEST_unc_{uuid.uuid4().hex[:6]}@grynd.example"
        rr = session.post(
            f"{API}/auth/register",
            json={"email": email, "password": "Password123!", "username": f"UN{uuid.uuid4().hex[:5]}"},
        )
        assert rr.status_code == 200
        tok = rr.json()["access_token"]
        ql = session.get(f"{API}/quests", headers=auth(tok)).json()
        target = ql[0]
        # complete
        rc = session.post(f"{API}/quests/{target['id']}/complete", headers=auth(tok))
        assert rc.status_code == 200
        gained = rc.json()["xp_gained"]
        after_complete = rc.json()["user"]
        # uncomplete
        ru = session.post(f"{API}/quests/{target['id']}/uncomplete", headers=auth(tok))
        assert ru.status_code == 200, ru.text
        body = ru.json()
        assert body["xp_refunded"] == gained
        assert body["user"]["total_xp"] == after_complete["total_xp"] - gained
        # verify quest now uncompleted
        ql2 = session.get(f"{API}/quests", headers=auth(tok)).json()
        assert not next(q for q in ql2 if q["id"] == target["id"])["completed_today"]

    def test_delete_quest(self, session, fresh_user):
        r = session.post(
            f"{API}/quests",
            json={"title": "TEST_to_delete", "xp_reward": 10, "icon": "🗑️"},
            headers=auth(fresh_user["token"]),
        )
        qid = r.json()["id"]
        rd = session.delete(f"{API}/quests/{qid}", headers=auth(fresh_user["token"]))
        assert rd.status_code == 200
        rl = session.get(f"{API}/quests", headers=auth(fresh_user["token"]))
        assert not any(q["id"] == qid for q in rl.json())


# ---------- Journals ----------
class TestJournals:
    def test_create_list_delete(self, session, fresh_user):
        r = session.post(
            f"{API}/journals",
            json={"content": "TEST_grynd day 1 ✨", "mood": "🔥"},
            headers=auth(fresh_user["token"]),
        )
        assert r.status_code == 200, r.text
        body = r.json()
        jid = body["id"]
        assert body["content"] == "TEST_grynd day 1 ✨"
        assert body["mood"] == "🔥"
        # Create a second
        r2 = session.post(
            f"{API}/journals",
            json={"content": "TEST_grynd day 2", "mood": "😎"},
            headers=auth(fresh_user["token"]),
        )
        assert r2.status_code == 200
        jid2 = r2.json()["id"]
        # list sorted desc by created_at
        rl = session.get(f"{API}/journals", headers=auth(fresh_user["token"]))
        assert rl.status_code == 200
        entries = rl.json()
        ids = [j["id"] for j in entries]
        assert jid in ids and jid2 in ids
        # newest first — verify created_at desc
        created = [j["created_at"] for j in entries]
        assert created == sorted(created, reverse=True)
        # delete
        rd = session.delete(f"{API}/journals/{jid}", headers=auth(fresh_user["token"]))
        assert rd.status_code == 200
        rl2 = session.get(f"{API}/journals", headers=auth(fresh_user["token"]))
        assert not any(j["id"] == jid for j in rl2.json())

    def test_journal_max_140_chars(self, session, fresh_user):
        r = session.post(
            f"{API}/journals",
            json={"content": "x" * 141, "mood": "😎"},
            headers=auth(fresh_user["token"]),
        )
        assert r.status_code == 422


# ---------- Leaderboard ----------
class TestLeaderboard:
    def test_leaderboard_top50_sorted_with_me(self, session, fresh_user):
        r = session.get(f"{API}/leaderboard", headers=auth(fresh_user["token"]))
        assert r.status_code == 200
        body = r.json()
        assert "top" in body and "me" in body
        assert len(body["top"]) <= 50
        # sorted desc by total_xp
        xps = [u["total_xp"] for u in body["top"]]
        assert xps == sorted(xps, reverse=True)
        assert body["me"]["is_me"] is True
        assert body["me"]["id"] == fresh_user["user"]["id"]


# ---------- Monetization ----------
class TestMonetization:
    def test_xp_boost_sets_until_1h_ahead(self, session, fresh_user):
        from datetime import datetime, timezone, timedelta
        r = session.post(f"{API}/monetization/xp-boost", headers=auth(fresh_user["token"]))
        assert r.status_code == 200
        body = r.json()
        assert body["xp_boost_until"]
        # ~1 hour from now (allow 5 min skew)
        until = datetime.fromisoformat(body["xp_boost_until"])
        now = datetime.now(timezone.utc)
        delta = until - now
        assert timedelta(minutes=55) < delta < timedelta(minutes=65), f"unexpected delta {delta}"
        # user object reflects boost
        assert body["user"]["xp_boost_until"] == body["xp_boost_until"]

    def test_qris_returns_string_amount_merchant(self, session, fresh_user):
        r = session.get(f"{API}/monetization/qris", headers=auth(fresh_user["token"]))
        assert r.status_code == 200
        body = r.json()
        assert body["qris_string"] and isinstance(body["qris_string"], str)
        assert body["amount_idr"] == 49000
        assert body["merchant"]

    def test_pro_activate_flips_is_pro(self, session):
        # use a fresh user to avoid polluting fresh_user state
        email = f"TEST_pro_{uuid.uuid4().hex[:6]}@grynd.example"
        rr = session.post(
            f"{API}/auth/register",
            json={"email": email, "password": "Password123!", "username": f"PR{uuid.uuid4().hex[:5]}"},
        )
        tok = rr.json()["access_token"]
        assert rr.json()["user"]["is_pro"] is False
        r = session.post(f"{API}/monetization/pro/activate", headers=auth(tok))
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is True
        assert body["user"]["is_pro"] is True
        # Verify persisted
        rv = session.get(f"{API}/auth/me", headers=auth(tok))
        assert rv.json()["is_pro"] is True
