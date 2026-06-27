"""Backend regression + innovation tests for GRYND.

Covers:
- Existing auth/quest/journal/leaderboard/monetization regression
- Combo XP system (1x -> 1.25x -> 1.5x -> 2x -> 3x RAGE within 10 min, same category)
- Shield default field
- AI Quest Coach (Gemini-3-Flash via Emergent LLM key) en + id
- Friend system (friend_code, add, list, idempotency, errors, high-five)
- Friends-only leaderboard
- Public profile HTML + OG tags
- OG SVG endpoint
- Push token registration idempotency
"""
import os
import re
import uuid
import time
import pytest
import requests

BASE = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("REACT_APP_BACKEND_URL")
assert BASE, "EXPO_PUBLIC_BACKEND_URL/REACT_APP_BACKEND_URL must be set"
BASE = BASE.rstrip("/")

TESTER_EMAIL = "tester@grynd.app"
TESTER_PASS = "Tester123!"


# ---------------- fixtures ----------------
@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def tester_token(s):
    r = s.post(f"{BASE}/api/auth/login", json={"email": TESTER_EMAIL, "password": TESTER_PASS})
    assert r.status_code == 200, f"tester login failed {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def tester_headers(tester_token):
    return {"Authorization": f"Bearer {tester_token}"}


@pytest.fixture(scope="session")
def tester_me(s, tester_headers):
    r = s.get(f"{BASE}/api/auth/me", headers=tester_headers)
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="session")
def friend_user(s):
    """Register a brand new user for friend tests."""
    uniq = uuid.uuid4().hex[:8]
    email = f"fr-user-{uniq}@grynd.app"
    payload = {"email": email, "password": "Friend123!", "username": f"fr{uniq}", "lang": "en"}
    r = s.post(f"{BASE}/api/auth/register", json=payload)
    assert r.status_code == 200, f"friend register failed: {r.text}"
    body = r.json()
    return {"token": body["access_token"], "user": body["user"], "email": email, "password": payload["password"]}


# ---------------- regression: basics ----------------
class TestRegression:
    def test_root(self, s):
        r = s.get(f"{BASE}/api/")
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_login_me(self, s, tester_headers):
        r = s.get(f"{BASE}/api/auth/me", headers=tester_headers)
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == TESTER_EMAIL
        # New innovation fields exist
        assert "shields" in body
        assert "friend_code" in body and body["friend_code"].startswith("GRYND-")
        assert "pet_stage" in body

    def test_list_quests(self, s, tester_headers):
        r = s.get(f"{BASE}/api/quests", headers=tester_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_journals_crud(self, s, tester_headers):
        # create
        r = s.post(f"{BASE}/api/journals", headers=tester_headers,
                   json={"content": "TEST journal entry", "mood": "🔥"})
        assert r.status_code == 200
        jid = r.json()["id"]
        # list
        r2 = s.get(f"{BASE}/api/journals", headers=tester_headers)
        assert r2.status_code == 200
        assert any(j["id"] == jid for j in r2.json())
        # delete
        r3 = s.delete(f"{BASE}/api/journals/{jid}", headers=tester_headers)
        assert r3.status_code == 200

    def test_leaderboard(self, s, tester_headers):
        r = s.get(f"{BASE}/api/leaderboard", headers=tester_headers)
        assert r.status_code == 200
        body = r.json()
        assert "top" in body and "me" in body

    def test_monet_qris(self, s, tester_headers):
        r = s.get(f"{BASE}/api/monetization/qris", headers=tester_headers)
        assert r.status_code == 200
        assert "qris_string" in r.json()


# ---------------- combo + shield ----------------
class TestComboShield:
    def _make_quest(self, s, headers, category, title=None, xp=20):
        payload = {"title": title or f"TEST {category} {uuid.uuid4().hex[:4]}",
                   "xp_reward": xp, "difficulty": "easy", "category": category,
                   "frequency": "daily", "icon": "⚡"}
        r = s.post(f"{BASE}/api/quests", headers=headers, json=payload)
        assert r.status_code == 200, r.text
        return r.json()["id"]

    @pytest.fixture(scope="class")
    def combo_user(self, s):
        """Fresh user so combo chain is deterministic, regardless of tester state."""
        uniq = uuid.uuid4().hex[:8]
        payload = {"email": f"combo-{uniq}@grynd.app", "password": "Combo123!",
                   "username": f"cmb{uniq}", "lang": "en"}
        r = s.post(f"{BASE}/api/auth/register", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        return {"token": body["access_token"], "user": body["user"]}

    def test_shield_default_zero(self, combo_user):
        assert combo_user["user"].get("shields", 0) == 0

    def test_combo_chain(self, s, combo_user):
        headers = {"Authorization": f"Bearer {combo_user['token']}"}
        # Create 5 fresh health quests + 1 study quest
        h_ids = [self._make_quest(s, headers, "health", xp=20) for _ in range(5)]
        study_id = self._make_quest(s, headers, "study", xp=20)

        expected = [(1, 1.0, 0), (2, 1.25, 5), (3, 1.5, 10), (4, 2.0, 20), (5, 3.0, 40)]
        for qid, (exp_c, exp_m, exp_bonus) in zip(h_ids, expected):
            r = s.post(f"{BASE}/api/quests/{qid}/complete", headers=headers)
            assert r.status_code == 200, r.text
            data = r.json()
            assert data["combo"] == exp_c, f"combo mismatch: got {data['combo']} expected {exp_c}"
            assert abs(data["combo_mult"] - exp_m) < 0.001, f"mult mismatch combo={exp_c}: {data['combo_mult']}"
            assert data["combo_bonus_xp"] == exp_bonus, f"bonus mismatch combo={exp_c}: {data['combo_bonus_xp']}"

        # Different category resets to 1
        r = s.post(f"{BASE}/api/quests/{study_id}/complete", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert data["combo"] == 1
        assert data["combo_mult"] == 1.0
        assert data["combo_bonus_xp"] == 0
        # shields default 0 still (no streak crossings done)
        assert data["shields"] == 0
        assert data["shield_used"] is False


# ---------------- AI coach ----------------
class TestAICoach:
    def test_coach_requires_auth(self, s):
        r = s.post(f"{BASE}/api/ai/coach", json={"goal": "Learn Python in 30 days", "lang": "en"})
        assert r.status_code == 401

    def test_coach_en(self, s, tester_headers):
        r = s.post(f"{BASE}/api/ai/coach", headers=tester_headers,
                   json={"goal": "Learn Python in 30 days", "lang": "en"}, timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["lang"] == "en"
        assert body["goal"]
        sugg = body["suggestions"]
        assert isinstance(sugg, list) and len(sugg) == 5
        diffs = {"trivial", "easy", "medium", "hard"}
        cats = {"morning", "health", "mind", "study", "social", "creative", "other"}
        xp_map = {"trivial": 10, "easy": 20, "medium": 40, "hard": 75}
        for q in sugg:
            assert q["difficulty"] in diffs
            assert q["category"] in cats
            assert q["xp_reward"] == xp_map[q["difficulty"]]
            assert q["title"]
            assert q["icon"]

    def test_coach_id_language(self, s, tester_headers):
        r = s.post(f"{BASE}/api/ai/coach", headers=tester_headers,
                   json={"goal": "Belajar bahasa Inggris dalam 30 hari", "lang": "id"}, timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["lang"] == "id"
        # Heuristic: titles likely contain ASCII but at least one common Indonesian word.
        joined = " ".join(q["title"].lower() for q in body["suggestions"])
        id_hints = ["menit", "hari", "jam", "baca", "tulis", "latihan", "kata", "belajar",
                    "selama", "setiap", "pelajari", "minum", "tonton", "dengarkan"]
        assert any(h in joined for h in id_hints), f"No Indonesian word hint found in: {joined}"

    def test_ai_accept_persists(self, s, tester_headers):
        # Get fresh suggestions, accept first 3
        r = s.post(f"{BASE}/api/ai/coach", headers=tester_headers,
                   json={"goal": "Build a daily reading habit", "lang": "en"}, timeout=60)
        assert r.status_code == 200
        picked = r.json()["suggestions"][:3]
        # tag titles so we can find them in subsequent GET /quests
        marker = f"AITEST-{uuid.uuid4().hex[:6]}"
        for q in picked:
            q["title"] = f"{marker} {q['title']}"[:80]
            q["frequency"] = "daily"

        r2 = s.post(f"{BASE}/api/ai/accept", headers=tester_headers, json={"quests": picked})
        assert r2.status_code == 200, r2.text
        created = r2.json()["created"]
        assert len(created) == 3

        # Verify they appear in subsequent /api/quests
        r3 = s.get(f"{BASE}/api/quests", headers=tester_headers)
        assert r3.status_code == 200
        titles = [q["title"] for q in r3.json()]
        assert sum(1 for t in titles if t.startswith(marker)) == 3


# ---------------- friends ----------------
class TestFriends:
    def test_social_me_has_code(self, s, tester_headers):
        r = s.get(f"{BASE}/api/social/me", headers=tester_headers)
        assert r.status_code == 200
        body = r.json()
        assert body["friend_code"].startswith("GRYND-")
        # And /auth/me has the same code
        r2 = s.get(f"{BASE}/api/auth/me", headers=tester_headers)
        assert r2.json()["friend_code"] == body["friend_code"]

    def test_add_friend_flow(self, s, tester_headers, friend_user):
        code = friend_user["user"]["friend_code"]
        # add
        r = s.post(f"{BASE}/api/social/friend/add", headers=tester_headers,
                   json={"friend_code": code})
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "added"
        # list contains friend
        r2 = s.get(f"{BASE}/api/social/friends", headers=tester_headers)
        assert r2.status_code == 200
        ids = [f["id"] for f in r2.json()["friends"]]
        assert friend_user["user"]["id"] in ids
        # idempotency
        r3 = s.post(f"{BASE}/api/social/friend/add", headers=tester_headers,
                    json={"friend_code": code})
        assert r3.status_code == 200
        assert r3.json()["status"] == "already_friends"

    def test_bad_friend_code(self, s, tester_headers):
        r = s.post(f"{BASE}/api/social/friend/add", headers=tester_headers,
                   json={"friend_code": "GRYND-ZZZZZ"})
        assert r.status_code == 404

    def test_add_self_returns_400(self, s, tester_headers, tester_me):
        r = s.post(f"{BASE}/api/social/friend/add", headers=tester_headers,
                   json={"friend_code": tester_me["friend_code"]})
        assert r.status_code == 400

    def test_high_five(self, s, tester_headers, friend_user):
        # need to ensure friendship exists (created in test_add_friend_flow). Re-add (idempotent)
        s.post(f"{BASE}/api/social/friend/add", headers=tester_headers,
               json={"friend_code": friend_user["user"]["friend_code"]})

        # get friend's xp before
        friend_h = {"Authorization": f"Bearer {friend_user['token']}"}
        before = s.get(f"{BASE}/api/auth/me", headers=friend_h).json()["total_xp"]

        r = s.post(f"{BASE}/api/social/high-five", headers=tester_headers,
                   json={"to_user_id": friend_user["user"]["id"]})
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "sent"

        after = s.get(f"{BASE}/api/auth/me", headers=friend_h).json()["total_xp"]
        assert after - before == 5, f"expected +5 morale xp, got {after-before}"

        r2 = s.post(f"{BASE}/api/social/high-five", headers=tester_headers,
                    json={"to_user_id": friend_user["user"]["id"]})
        assert r2.status_code == 200
        assert r2.json()["status"] == "already"

    def test_leaderboard_friends(self, s, tester_headers, tester_me):
        r = s.get(f"{BASE}/api/leaderboard/friends", headers=tester_headers)
        assert r.status_code == 200
        top = r.json()["top"]
        assert isinstance(top, list)
        me_rows = [row for row in top if row.get("is_me")]
        assert len(me_rows) == 1
        # sorted desc by total_xp
        xps = [row["total_xp"] for row in top]
        assert xps == sorted(xps, reverse=True)


# ---------------- public profile + OG ----------------
class TestPublicProfileOG:
    def test_profile_html(self, s):
        r = s.get(f"{BASE}/api/u/tester")
        assert r.status_code == 200
        assert "text/html" in r.headers.get("content-type", "").lower()
        html = r.text
        assert "@tester" in html
        # og:title meta exists and includes @tester
        m = re.search(r'<meta property="og:title" content="([^"]+)"', html)
        assert m and "@tester" in m.group(1)
        # og:image points to /api/og/tester.svg
        m2 = re.search(r'<meta property="og:image" content="([^"]+)"', html)
        assert m2 and m2.group(1).endswith("/api/og/tester.svg")
        # twitter:card summary_large_image
        assert 'name="twitter:card" content="summary_large_image"' in html

    def test_profile_404(self, s):
        r = s.get(f"{BASE}/api/u/does-not-exist-{uuid.uuid4().hex[:6]}")
        assert r.status_code == 404
        assert "text/html" in r.headers.get("content-type", "").lower()

    def test_og_svg(self, s):
        r = s.get(f"{BASE}/api/og/tester.svg")
        assert r.status_code == 200
        ct = r.headers.get("content-type", "").lower()
        assert "image/svg+xml" in ct
        body = r.text
        assert "<svg" in body
        assert "GRYND" in body
        # level number present
        assert re.search(r"font-size=\"200\"[^>]*>\d+<", body)


# ---------------- push ----------------
class TestPush:
    def test_push_register_idempotent(self, s, tester_headers):
        body = {"token": "ExponentPushToken[test]", "platform": "web"}
        r1 = s.post(f"{BASE}/api/push/register", headers=tester_headers, json=body)
        assert r1.status_code == 200 and r1.json()["ok"] is True
        r2 = s.post(f"{BASE}/api/push/register", headers=tester_headers, json=body)
        assert r2.status_code == 200 and r2.json()["ok"] is True
