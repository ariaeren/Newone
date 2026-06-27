"""GRYND social auth + rebrand backend tests"""
import os
import uuid
import time
import pytest
import requests
import jwt as pyjwt

BASE_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or os.environ.get("EXPO_BACKEND_URL")
).rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def _make_unsigned_apple_jwt(sub: str, email: str | None = None) -> str:
    claims = {"sub": sub, "iss": "apple", "aud": "com.grynd.app", "exp": 9999999999}
    if email:
        claims["email"] = email
    return pyjwt.encode(claims, "doesnt_matter", algorithm="HS256")


# ---------- Rebrand ----------
class TestRebrand:
    def test_root_service_is_grynd(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        body = r.json()
        assert body.get("ok") is True
        assert body.get("service") == "grynd", f"service rebrand failed: {body}"


# ---------- Google ----------
class TestGoogleAuth:
    def test_google_invalid_session_returns_401(self, session):
        r = session.post(
            f"{API}/auth/google",
            json={"session_id": "obviously-not-a-real-session-" + uuid.uuid4().hex},
        )
        # Possible: 401 invalid OR 502 if provider unreachable; primary expectation 401
        assert r.status_code in (401, 502), f"expected 401, got {r.status_code} {r.text}"
        if r.status_code == 401:
            assert "Invalid Google session" in r.text

    def test_google_missing_session_id_returns_422(self, session):
        r = session.post(f"{API}/auth/google", json={})
        assert r.status_code == 422

    def test_google_too_short_session_id_returns_422(self, session):
        r = session.post(f"{API}/auth/google", json={"session_id": "ab"})
        assert r.status_code == 422


# ---------- Apple ----------
class TestAppleAuth:
    @pytest.fixture(scope="class")
    def apple_creds(self):
        sub = f"001234.{uuid.uuid4().hex[:8]}"
        email = f"tester_{uuid.uuid4().hex[:6]}@apple.fake"
        token = _make_unsigned_apple_jwt(sub, email)
        return {"sub": sub, "email": email, "token": token}

    def test_apple_success_creates_user(self, session, apple_creds):
        r = session.post(
            f"{API}/auth/apple",
            json={
                "identity_token": apple_creds["token"],
                "full_name": "Apple Tester",
            },
        )
        assert r.status_code == 200, f"apple auth failed: {r.status_code} {r.text}"
        body = r.json()
        assert "access_token" in body
        assert body["user"]["email"] == apple_creds["email"].lower()
        assert body["user"]["level"] == 1
        # stash for later
        apple_creds["user_id"] = body["user"]["id"]
        apple_creds["access_token"] = body["access_token"]

    def test_apple_second_call_reuses_user(self, session, apple_creds):
        # ensure first call ran
        if "user_id" not in apple_creds:
            pytest.skip("first apple call did not succeed")
        r = session.post(
            f"{API}/auth/apple",
            json={
                "identity_token": apple_creds["token"],
                "full_name": "Apple Tester",
            },
        )
        assert r.status_code == 200
        assert r.json()["user"]["id"] == apple_creds["user_id"], "duplicate user created!"

    def test_apple_seeded_quests(self, session, apple_creds):
        if "access_token" not in apple_creds:
            pytest.skip("first apple call did not succeed")
        r = session.get(f"{API}/quests", headers=auth_headers(apple_creds["access_token"]))
        assert r.status_code == 200
        quests = r.json()
        assert len(quests) == 4, f"expected 4 starter quests, got {len(quests)}"

    def test_apple_me_works_with_returned_token(self, session, apple_creds):
        if "access_token" not in apple_creds:
            pytest.skip("first apple call did not succeed")
        r = session.get(f"{API}/auth/me", headers=auth_headers(apple_creds["access_token"]))
        assert r.status_code == 200
        assert r.json()["email"] == apple_creds["email"].lower()

    def test_apple_malformed_token_returns_401(self, session):
        r = session.post(
            f"{API}/auth/apple",
            json={"identity_token": "not.a.real.jwt.at.all", "full_name": "Junk"},
        )
        assert r.status_code == 401
        assert "Invalid Apple identity token" in r.text

    def test_apple_private_relay_synthesizes_email(self, session):
        # token with sub but no email; body has no email either
        sub = f"001999.{uuid.uuid4().hex[:8]}"
        token = _make_unsigned_apple_jwt(sub, email=None)
        r = session.post(
            f"{API}/auth/apple",
            json={"identity_token": token, "full_name": "Relay Tester"},
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        body = r.json()
        expected_email = f"{sub}@privaterelay.appleid.com".lower()
        assert body["user"]["email"] == expected_email, f"got {body['user']['email']}"


# ---------- Regression: existing flows ----------
class TestRegression:
    @pytest.fixture(scope="class")
    def reg_user(self, session):
        email = f"TEST_reg_{uuid.uuid4().hex[:8]}@grynd.example.com"
        payload = {"email": email, "password": "password123", "username": f"reg_{uuid.uuid4().hex[:5]}"}
        r = session.post(f"{API}/auth/register", json=payload)
        assert r.status_code == 200, f"register: {r.status_code} {r.text}"
        d = r.json()
        return {"token": d["access_token"], "user": d["user"], "email": email}

    def test_register_works(self, reg_user):
        assert reg_user["user"]["level"] == 1

    def test_login_works(self, session, reg_user):
        r = session.post(
            f"{API}/auth/login",
            json={"email": reg_user["email"], "password": "password123"},
        )
        assert r.status_code == 200

    def test_me_works(self, session, reg_user):
        r = session.get(f"{API}/auth/me", headers=auth_headers(reg_user["token"]))
        assert r.status_code == 200

    def test_quests_endpoint(self, session, reg_user):
        r = session.get(f"{API}/quests", headers=auth_headers(reg_user["token"]))
        assert r.status_code == 200
        assert len(r.json()) == 4

    def test_journals_endpoint(self, session, reg_user):
        r = session.get(f"{API}/journals", headers=auth_headers(reg_user["token"]))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_leaderboard_endpoint(self, session, reg_user):
        r = session.get(f"{API}/leaderboard", headers=auth_headers(reg_user["token"]))
        assert r.status_code == 200
        body = r.json()
        assert "top" in body and "me" in body

    def test_monetization_qris(self, session, reg_user):
        r = session.get(f"{API}/monetization/qris", headers=auth_headers(reg_user["token"]))
        assert r.status_code == 200
        assert r.json()["amount_idr"] == 49000
