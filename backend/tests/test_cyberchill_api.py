"""Cyber-Chill backend API tests"""
import os
import uuid
import time
import pytest
import requests

BASE_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or os.environ.get("EXPO_BACKEND_URL")
    or "https://levelhub-app.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"

SEED_EMAIL = "test@cyber.chill"
SEED_PASSWORD = "password123"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def fresh_user(session):
    """Register a fresh user and return its token + user object."""
    email = f"TEST_{uuid.uuid4().hex[:8]}@cyber.chill"
    payload = {"email": email, "password": "password123", "username": f"TEST_{uuid.uuid4().hex[:5]}"}
    r = session.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    return {"token": data["access_token"], "user": data["user"], "email": email, "password": "password123"}


@pytest.fixture(scope="session")
def seed_user(session):
    r = session.post(f"{API}/auth/login", json={"email": SEED_EMAIL, "password": SEED_PASSWORD})
    if r.status_code != 200:
        # auto-create the seed user if missing
        session.post(
            f"{API}/auth/register",
            json={"email": SEED_EMAIL, "password": SEED_PASSWORD, "username": "NeonRunner"},
        )
        r = session.post(f"{API}/auth/login", json={"email": SEED_EMAIL, "password": SEED_PASSWORD})
    assert r.status_code == 200, f"seed login failed: {r.status_code} {r.text}"
    d = r.json()
    return {"token": d["access_token"], "user": d["user"]}


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Health ----------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------- Auth ----------
class TestAuth:
    def test_register_creates_user_and_seeds_quests(self, session, fresh_user):
        assert "access_token" in {"access_token": fresh_user["token"]}
        user = fresh_user["user"]
        assert user["level"] == 1
        assert user["total_xp"] == 0
        assert user["is_pro"] is False
        # quests seeded
        r = session.get(f"{API}/quests", headers=auth_headers(fresh_user["token"]))
        assert r.status_code == 200
        quests = r.json()
        assert len(quests) == 4, f"expected 4 starter quests, got {len(quests)}"

    def test_register_duplicate_email(self, session, fresh_user):
        r = session.post(
            f"{API}/auth/register",
            json={"email": fresh_user["email"], "password": "password123", "username": "Dupe"},
        )
        assert r.status_code == 400

    def test_login_valid(self, session, fresh_user):
        r = session.post(
            f"{API}/auth/login",
            json={"email": fresh_user["email"], "password": fresh_user["password"]},
        )
        assert r.status_code == 200
        assert "access_token" in r.json()

    def test_login_invalid(self, session):
        r = session.post(
            f"{API}/auth/login",
            json={"email": "nobody@nowhere.io", "password": "wrong"},
        )
        assert r.status_code == 401

    def test_me_with_token(self, session, fresh_user):
        r = session.get(f"{API}/auth/me", headers=auth_headers(fresh_user["token"]))
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == fresh_user["email"].lower()
        assert "_id" not in body

    def test_me_without_token(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_patch_me(self, session, fresh_user):
        r = session.patch(
            f"{API}/auth/me",
            json={"avatar_emoji": "🛸", "username": "NeonTest"},
            headers=auth_headers(fresh_user["token"]),
        )
        assert r.status_code == 200
        assert r.json()["avatar_emoji"] == "🛸"
        assert r.json()["username"] == "NeonTest"


# ---------- Quests ----------
class TestQuests:
    def test_list_quests_has_completed_today_flag(self, session, fresh_user):
        r = session.get(f"{API}/quests", headers=auth_headers(fresh_user["token"]))
        assert r.status_code == 200
        for q in r.json():
            assert "completed_today" in q
            assert "_id" not in q

    def test_create_and_delete_quest(self, session, fresh_user):
        r = session.post(
            f"{API}/quests",
            json={"title": "TEST_meditate", "xp_reward": 25, "icon": "🧘"},
            headers=auth_headers(fresh_user["token"]),
        )
        assert r.status_code == 200
        qid = r.json()["id"]
        # Verify via GET
        r2 = session.get(f"{API}/quests", headers=auth_headers(fresh_user["token"]))
        assert any(q["id"] == qid for q in r2.json())
        # Delete
        r3 = session.delete(f"{API}/quests/{qid}", headers=auth_headers(fresh_user["token"]))
        assert r3.status_code == 200
        r4 = session.get(f"{API}/quests", headers=auth_headers(fresh_user["token"]))
        assert not any(q["id"] == qid for q in r4.json())

    def test_complete_quest_awards_xp(self, session, fresh_user):
        r = session.get(f"{API}/quests", headers=auth_headers(fresh_user["token"]))
        quests = r.json()
        target = next(q for q in quests if not q.get("completed_today"))
        before_xp = fresh_user["user"]["total_xp"]
        rc = session.post(
            f"{API}/quests/{target['id']}/complete",
            headers=auth_headers(fresh_user["token"]),
        )
        assert rc.status_code == 200, rc.text
        result = rc.json()
        assert result["xp_gained"] == target["xp_reward"]
        assert result["user"]["total_xp"] == before_xp + target["xp_reward"]
        assert result["streak_count"] >= 1

    def test_double_complete_blocked(self, session, fresh_user):
        r = session.get(f"{API}/quests", headers=auth_headers(fresh_user["token"]))
        target = next((q for q in r.json() if q.get("completed_today")), None)
        assert target is not None, "expected at least one completed quest from previous test"
        rc = session.post(
            f"{API}/quests/{target['id']}/complete",
            headers=auth_headers(fresh_user["token"]),
        )
        assert rc.status_code == 400

    def test_complete_unknown_quest(self, session, fresh_user):
        rc = session.post(
            f"{API}/quests/{uuid.uuid4()}/complete",
            headers=auth_headers(fresh_user["token"]),
        )
        assert rc.status_code == 404


# ---------- Journals ----------
class TestJournals:
    def test_create_list_delete(self, session, fresh_user):
        r = session.post(
            f"{API}/journals",
            json={"content": "TEST_feeling charged ⚡", "mood": "🔥"},
            headers=auth_headers(fresh_user["token"]),
        )
        assert r.status_code == 200
        jid = r.json()["id"]
        # list
        rl = session.get(f"{API}/journals", headers=auth_headers(fresh_user["token"]))
        assert rl.status_code == 200
        assert any(j["id"] == jid for j in rl.json())
        # delete
        rd = session.delete(f"{API}/journals/{jid}", headers=auth_headers(fresh_user["token"]))
        assert rd.status_code == 200

    def test_journal_max_140_chars(self, session, fresh_user):
        r = session.post(
            f"{API}/journals",
            json={"content": "x" * 141, "mood": "😎"},
            headers=auth_headers(fresh_user["token"]),
        )
        assert r.status_code == 422


# ---------- Leaderboard ----------
class TestLeaderboard:
    def test_leaderboard_marks_me(self, session, fresh_user):
        r = session.get(f"{API}/leaderboard", headers=auth_headers(fresh_user["token"]))
        assert r.status_code == 200
        body = r.json()
        assert "top" in body and "me" in body
        assert body["me"]["is_me"] is True
        # sorted desc
        xps = [u["total_xp"] for u in body["top"]]
        assert xps == sorted(xps, reverse=True)


# ---------- Monetization ----------
class TestMonetization:
    def test_qris_payload(self, session, fresh_user):
        r = session.get(f"{API}/monetization/qris", headers=auth_headers(fresh_user["token"]))
        assert r.status_code == 200
        body = r.json()
        assert body["amount_idr"] == 49000
        assert body["merchant"]
        assert body["label"]
        assert body["qris_string"]

    def test_pro_activate(self, session):
        # use a brand new user so other tests aren't affected
        email = f"TEST_pro_{uuid.uuid4().hex[:6]}@cyber.chill"
        rr = session.post(
            f"{API}/auth/register",
            json={"email": email, "password": "password123", "username": "ProTester"},
        )
        token = rr.json()["access_token"]
        r = session.post(f"{API}/monetization/pro/activate", headers=auth_headers(token))
        assert r.status_code == 200
        user = r.json()["user"]
        assert user["is_pro"] is True
        assert user["avatar_emoji"] == "👾"

    def test_xp_boost_doubles_xp(self, session):
        # fresh user for clean state
        email = f"TEST_boost_{uuid.uuid4().hex[:6]}@cyber.chill"
        rr = session.post(
            f"{API}/auth/register",
            json={"email": email, "password": "password123", "username": "BoostTester"},
        )
        token = rr.json()["access_token"]
        # activate boost
        rb = session.post(f"{API}/monetization/xp-boost", headers=auth_headers(token))
        assert rb.status_code == 200
        assert rb.json()["xp_boost_until"]
        # complete a quest
        ql = session.get(f"{API}/quests", headers=auth_headers(token)).json()
        target = ql[0]
        rc = session.post(
            f"{API}/quests/{target['id']}/complete", headers=auth_headers(token)
        )
        assert rc.status_code == 200
        assert rc.json()["xp_gained"] == target["xp_reward"] * 2
