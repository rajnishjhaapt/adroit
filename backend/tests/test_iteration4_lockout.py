# Iteration 4: login_failures-based lockout (per IP+email 5, per email 10 ignoring IP, success clears IP failures)
# plus quick auth regression (login, me, logout, staff 403 on admin-only routes)
import uuid
import requests
import pytest

from conftest import API, ADMIN_EMAIL, ADMIN_PASSWORD, fwd, db, login, CREATED_USER_IDS

STAFF_PW = "TEST_Staff-Pass-123"


def _post(email, pw, h):
    return requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, headers=h, timeout=30)


@pytest.fixture
def test_email():
    email = f"test_lk_{uuid.uuid4().hex[:8]}@example.com"
    yield email
    db().login_failures.delete_many({"email": email})


class TestLockout:
    def test_ip_email_lock_on_6th(self, test_email):
        h = fwd()
        codes = [_post(test_email, f"bad{i}", h).status_code for i in range(6)]
        assert codes == [401] * 5 + [429], codes
        r = _post(test_email, "x", h)
        assert r.status_code == 429 and "15 minutes" in r.json()["detail"]
        # different IP not yet locked (only 5 failures for email)
        assert _post(test_email, "bad", fwd()).status_code == 401

    def test_failures_stored_in_collection(self, test_email):
        h = fwd()
        _post(test_email, "bad", h)
        docs = list(db().login_failures.find({"email": test_email}, {"_id": 0}))
        assert len(docs) == 1 and docs[0]["ip"] == h["X-Forwarded-For"] and docs[0]["at"]

    def test_per_email_lock_rotating_ips(self, test_email):
        codes = [_post(test_email, f"bad{i}", fwd()).status_code for i in range(10)]
        assert codes == [401] * 10, codes
        r = _post(test_email, "bad", fwd())
        assert r.status_code == 429, r.status_code
        assert _post(test_email, "bad", fwd()).status_code == 429

    def test_email_case_normalized(self, test_email):
        h = fwd()
        for i in range(5):
            _post(test_email.upper() if i % 2 else test_email, "bad", h)
        assert _post(test_email.upper(), "bad", h).status_code == 429

    def test_success_clears_ip_failures(self, admin):
        email = f"test_clr_{uuid.uuid4().hex[:6]}@example.com"
        r = admin.post(f"{API}/users", json={"name": "TEST_clear", "email": email, "password": STAFF_PW, "role": "staff"})
        assert r.status_code == 200, r.text
        CREATED_USER_IDS.append(r.json()["user_id"])
        try:
            h = fwd()
            for i in range(4):
                assert _post(email, "badpass", h).status_code == 401
            other = fwd()
            _post(email, "badpass", other)
            assert db().login_failures.count_documents({"email": email}) == 5
            ok = _post(email, STAFF_PW, h)
            assert ok.status_code == 200, ok.text
            assert db().login_failures.count_documents({"email": email, "ip": h["X-Forwarded-For"]}) == 0
            # other IP's failure remains (only that IP's failures cleared)
            assert db().login_failures.count_documents({"email": email, "ip": other["X-Forwarded-For"]}) == 1
            # 4 more failures on h -> still 401 (count restarted)
            for i in range(4):
                assert _post(email, "badpass", h).status_code == 401
        finally:
            db().login_failures.delete_many({"email": email})


class TestRegression:
    def test_admin_login_me_logout(self):
        s, r = login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert r.status_code == 200 and r.json()["role"] == "admin"
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200 and me.json()["email"] == ADMIN_EMAIL
        assert s.get(f"{API}/admin/stats").status_code == 200
        assert s.post(f"{API}/auth/logout").status_code == 200
        assert s.get(f"{API}/auth/me").status_code == 401

    def test_admin_email_has_no_failures_left(self):
        assert db().login_failures.count_documents({"email": ADMIN_EMAIL}) < 5

    @pytest.mark.parametrize("method,path", [("get", "/admin/services"), ("put", "/admin/content"),
                                             ("get", "/users"), ("post", "/users"), ("post", "/admin/services")])
    def test_staff_403(self, admin, method, path):
        if "staff" not in pytest.__dict__.setdefault("_it4", {}):
            email = f"test_st_{uuid.uuid4().hex[:6]}@example.com"
            r = admin.post(f"{API}/users", json={"name": "TEST_st", "email": email, "password": STAFF_PW, "role": "staff"})
            assert r.status_code == 200
            CREATED_USER_IDS.append(r.json()["user_id"])
            s, lr = login(email, STAFF_PW)
            assert lr.status_code == 200 and lr.json()["role"] == "staff"
            pytest._it4["staff"] = s
        s = pytest._it4["staff"]
        assert s.get(f"{API}/auth/me").status_code == 200
        assert s.get(f"{API}/admin/enquiries").status_code == 200
        r = getattr(s, method)(f"{API}{path}", json={})
        assert r.status_code == 403, (path, r.status_code)
