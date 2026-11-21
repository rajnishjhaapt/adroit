# Custom cookie-session admin auth (Clerk removed): login/logout/me, cookie flags, expiry, lockout,
# unauthorized/forbidden access, staff scoping, disable/reset revocation, change password, admin features regression
import re
import uuid
from datetime import datetime, timedelta, timezone

import requests
import pytest

from conftest import API, BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, fwd, db, login, CREATED_REFS, CREATED_USER_IDS
import hashlib

ADMIN_ROUTES = [
    ("get", "/admin/stats"), ("get", "/admin/enquiries"), ("get", "/admin/enquiries/export.csv"),
    ("get", "/admin/enquiries/x"), ("patch", "/admin/enquiries/x"), ("post", "/admin/enquiries/x/notes"),
    ("get", "/admin/assignees"), ("get", "/admin/services"), ("post", "/admin/services"),
    ("put", "/admin/services/x"), ("delete", "/admin/services/x"), ("post", "/admin/services/reorder"),
    ("put", "/admin/content"), ("get", "/users"), ("post", "/users"), ("patch", "/users/x/role"),
    ("post", "/users/x/password"), ("post", "/auth/change-password"), ("get", "/auth/me"),
]
STAFF_PW = "TEST_Staff-Pass-123"
STATE = {}


def sha(t):
    return hashlib.sha256(t.encode()).hexdigest()


def new_staff(admin, tag):
    email = f"test_{tag}_{uuid.uuid4().hex[:6]}@example.com"
    r = admin.post(f"{API}/users", json={"name": f"TEST_{tag}", "email": email, "password": STAFF_PW, "role": "staff"})
    assert r.status_code == 200, r.text
    CREATED_USER_IDS.append(r.json()["user_id"])
    assert "password_hash" not in r.json()
    return r.json()["user_id"], email


# --- Clerk removal ---
class TestClerkGone:
    def test_clerk_config_404(self):
        assert requests.get(f"{API}/clerk/config").status_code == 404

    def test_no_clerk_in_index(self):
        html = requests.get(BASE_URL).text.lower()
        assert "clerk" not in html


# --- Login / cookie / me / logout ---
class TestLogin:
    def test_wrong_password(self):
        h = fwd()
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong-password"}, headers=h)
        # remove this run's failure so repeated runs never accumulate toward the admin's per-email lock
        db().login_failures.delete_many({"email": ADMIN_EMAIL, "ip": h["X-Forwarded-For"]})
        assert r.status_code == 401 and r.json()["detail"] == "Invalid email or password"

    def test_unknown_email(self):
        h = fwd()
        r = requests.post(f"{API}/auth/login", json={"email": "nobody_test@example.com", "password": "whatever12345"}, headers=h)
        db().login_failures.delete_many({"email": "nobody_test@example.com", "ip": h["X-Forwarded-For"]})
        assert r.status_code == 401

    def test_login_cookie_flags_and_me(self):
        s, r = login(ADMIN_EMAIL.upper(), ADMIN_PASSWORD)
        assert r.status_code == 200
        d = r.json()
        assert d["role"] == "admin" and d["email"] == ADMIN_EMAIL and d["user_id"] == "admin"
        sc = r.headers["set-cookie"]
        assert sc.startswith("adroit_session=")
        low = sc.lower()
        assert "httponly" in low and "secure" in low and "path=/" in low
        # backend emits SameSite=strict; the Emergent preview ingress rewrites it to SameSite=None; Partitioned
        assert "samesite=strict" in low or ("samesite=none" in low and "partitioned" in low)
        m = re.search(r"max-age=(\d+)", low)
        assert m and abs(int(m.group(1)) - 8 * 3600) <= 60
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200 and me.json()["role"] == "admin"
        # logout
        lo = s.post(f"{API}/auth/logout")
        assert lo.status_code == 200
        assert s.get(f"{API}/auth/me").status_code == 401

    def test_old_cookie_invalid_after_logout(self):
        s, r = login(ADMIN_EMAIL, ADMIN_PASSWORD)
        tok = s.cookies.get("adroit_session")
        s.post(f"{API}/auth/logout")
        r = requests.get(f"{API}/auth/me", cookies={"adroit_session": tok})
        assert r.status_code == 401

    def test_bearer_not_accepted(self):
        s, r = login(ADMIN_EMAIL, ADMIN_PASSWORD)
        tok = s.cookies.get("adroit_session")
        assert requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"}).status_code == 401
        s.post(f"{API}/auth/logout")

    def test_session_expiry(self):
        s, r = login(ADMIN_EMAIL, ADMIN_PASSWORD)
        tok = s.cookies.get("adroit_session")
        d = db()
        res = d.sessions.update_one({"token_hash": sha(tok)},
                                    {"$set": {"expires_at": datetime.now(timezone.utc) - timedelta(minutes=1)}})
        assert res.matched_count == 1
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 401 and "expired" in me.json()["detail"].lower()
        d.sessions.delete_one({"token_hash": sha(tok)})

    def test_lockout_429(self):
        # Uses a TEST_ email (never the real admin) so the per-email lock cannot lock out the admin
        h, email = fwd(), f"test_lock_{uuid.uuid4().hex[:6]}@example.com"
        try:
            for i in range(5):
                r = requests.post(f"{API}/auth/login", json={"email": email, "password": f"bad{i}"}, headers=h)
                assert r.status_code == 401, (i, r.status_code)
            r = requests.post(f"{API}/auth/login", json={"email": email, "password": "bad-again"}, headers=h)
            assert r.status_code == 429
        finally:
            db().login_failures.delete_many({"email": email})


# --- Unauthorized access ---
class TestUnauthorized:
    @pytest.mark.parametrize("method,path", ADMIN_ROUTES)
    def test_401_without_cookie(self, method, path):
        r = requests.request(method, f"{API}{path}", json={})
        assert r.status_code == 401, (path, r.status_code)

    def test_garbage_cookie_401(self):
        assert requests.get(f"{API}/admin/stats", cookies={"adroit_session": "garbage"}).status_code == 401


# --- Staff role, scope, disable / reset revocation, change password ---
class TestStaff:
    def test_staff_forbidden_and_scope(self, admin):
        uid, email = new_staff(admin, "staff")
        s, r = login(email, STAFF_PW)
        assert r.status_code == 200 and r.json()["role"] == "staff"
        for path in ["/admin/services", "/users", "/admin/assignees"]:
            assert s.get(f"{API}{path}").status_code == 403, path
        assert s.put(f"{API}/admin/content", json={}).status_code in (403, 422)
        # content: valid body should still be 403
        content = requests.get(f"{API}/content").json()
        assert s.put(f"{API}/admin/content", json=content).status_code == 403
        assert s.get(f"{API}/admin/enquiries").json() == []
        # create one TEST_ enquiry, assign to staff
        key = uuid.uuid4().hex
        e = requests.post(f"{API}/enquiries", headers=fwd(), json={
            "kind": "contact", "full_name": "TEST_AuthCheck", "mobile": "9876500011", "email": "test_auth@example.com",
            "message": "TEST_ auth regression enquiry", "consent": True, "submission_key": key})
        assert e.status_code == 200, e.text
        ref = e.json()["reference"]
        CREATED_REFS.append(ref)
        enq = [x for x in admin.get(f"{API}/admin/enquiries", params={"q": ref}).json()]
        assert len(enq) == 1
        eid = enq[0]["id"]
        STATE["eid"], STATE["ref"] = eid, ref
        assert s.get(f"{API}/admin/enquiries/{eid}").status_code == 404
        p = admin.patch(f"{API}/admin/enquiries/{eid}", json={"assigned_to": uid})
        assert p.status_code == 200 and p.json()["assigned_to"] == uid
        lst = s.get(f"{API}/admin/enquiries").json()
        assert [x["id"] for x in lst] == [eid]
        assert s.get(f"{API}/admin/stats").json()["total"] == 1
        # staff can update status and add note, but not assign
        assert s.patch(f"{API}/admin/enquiries/{eid}", json={"status": "in_progress"}).json()["status"] == "in_progress"
        assert s.post(f"{API}/admin/enquiries/{eid}/notes", json={"text": "TEST_ staff note"}).status_code == 200
        assert s.patch(f"{API}/admin/enquiries/{eid}", json={"assigned_to": "admin"}).status_code == 403
        csv = s.get(f"{API}/admin/enquiries/export.csv")
        assert csv.status_code == 200 and csv.text.count("\n") == 2
        STATE["staff"] = (uid, email, s)

    def test_admin_assign_administrator_notes_history(self, admin):
        eid = STATE["eid"]
        r = admin.patch(f"{API}/admin/enquiries/{eid}", json={"assigned_to": "admin", "status": "completed"})
        assert r.status_code == 200
        d = r.json()
        assert d["assigned_to"] == "admin" and d["assigned_name"] == "Administrator" and d["status"] == "completed"
        n = admin.post(f"{API}/admin/enquiries/{eid}/notes", json={"text": "TEST_ admin note"}).json()
        assert any(x["text"] == "TEST_ admin note" for x in n["notes"])
        actions = [h["action"] for h in n["history"]]
        assert "Assigned to Administrator" in actions and "Internal note added" in actions
        assignees = admin.get(f"{API}/admin/assignees").json()
        assert assignees[0] == {"user_id": "admin", "name": "Administrator", "role": "admin"}
        # staff no longer sees it
        assert STATE["staff"][2].get(f"{API}/admin/enquiries/{eid}").status_code == 404

    def test_change_password_staff(self, admin):
        uid, email, s = STATE["staff"]
        bad = s.post(f"{API}/auth/change-password", json={"current_password": "wrong-pass-1", "new_password": "TEST_NewPass-999"})
        assert bad.status_code == 400
        short = s.post(f"{API}/auth/change-password", json={"current_password": STAFF_PW, "new_password": "short"})
        assert short.status_code == 422
        # second session should be revoked by change
        s2, _ = login(email, STAFF_PW)
        ok = s.post(f"{API}/auth/change-password", json={"current_password": STAFF_PW, "new_password": "TEST_NewPass-999"})
        assert ok.status_code == 200
        assert s.get(f"{API}/auth/me").status_code == 200
        assert s2.get(f"{API}/auth/me").status_code == 401
        assert login(email, STAFF_PW)[1].status_code == 401
        assert login(email, "TEST_NewPass-999")[1].status_code == 200

    def test_admin_reset_revokes_sessions(self, admin):
        uid, email, s = STATE["staff"]
        r = admin.post(f"{API}/users/{uid}/password", json={"password": "TEST_Reset-Pass-77"})
        assert r.status_code == 200
        assert s.get(f"{API}/auth/me").status_code == 401
        assert db().sessions.count_documents({"user_id": uid}) == 0
        s3, r3 = login(email, "TEST_Reset-Pass-77")
        assert r3.status_code == 200
        STATE["staff"] = (uid, email, s3)

    def test_disable_revokes_and_blocks_login(self, admin):
        uid, email, s = STATE["staff"]
        r = admin.patch(f"{API}/users/{uid}/role", json={"role": "disabled"})
        assert r.status_code == 200
        assert s.get(f"{API}/auth/me").status_code == 401
        assert login(email, "TEST_Reset-Pass-77")[1].status_code == 401
        users = admin.get(f"{API}/users").json()
        row = [u for u in users["users"] if u["user_id"] == uid][0]
        assert row["role"] == "disabled" and "password_hash" not in row and row["has_password"] is True
        # re-enable as admin role, role change works
        assert admin.patch(f"{API}/users/{uid}/role", json={"role": "admin"}).status_code == 200
        s4, r4 = login(email, "TEST_Reset-Pass-77")
        assert r4.status_code == 200 and r4.json()["role"] == "admin"
        assert s4.get(f"{API}/admin/services").status_code == 200
        s4.post(f"{API}/auth/logout")

    def test_user_validation(self, admin):
        assert admin.post(f"{API}/users", json={"name": "TEST_x", "email": ADMIN_EMAIL, "password": "abcdefghijk"}).status_code == 409
        assert admin.post(f"{API}/users", json={"name": "TEST_x", "email": "bad", "password": "abcdefghijk"}).status_code == 422
        assert admin.post(f"{API}/users", json={"name": "TEST_x", "email": "t_x@example.com", "password": "short"}).status_code == 422


# --- Admin features regression ---
class TestAdminFeatures:
    def test_stats_search_filter_csv(self, admin):
        st = admin.get(f"{API}/admin/stats").json()
        assert st["total"] == st["new"] + st["in_progress"] + st["completed"]
        assert all(x["status"] == "new" for x in admin.get(f"{API}/admin/enquiries", params={"status": "new"}).json())
        assert all(x["kind"] == "contact" for x in admin.get(f"{API}/admin/enquiries", params={"kind": "contact"}).json())
        csv = admin.get(f"{API}/admin/enquiries/export.csv")
        assert csv.status_code == 200 and "attachment" in csv.headers["content-disposition"]
        assert csv.text.startswith("reference,created_at")

    def test_services_edit_hide_reorder_revert(self, admin):
        svcs = admin.get(f"{API}/admin/services").json()
        assert len(svcs) > 1
        s0 = svcs[0]
        fields = ["name", "description", "icon", "cta", "sub_services", "intro", "who_needs", "process", "documents", "faqs", "published"]
        body = {k: s0.get(k) for k in fields if s0.get(k) is not None}
        try:
            r = admin.put(f"{API}/admin/services/{s0['slug']}", json={**body, "description": "TEST_ desc", "published": False})
            assert r.status_code == 200 and r.json()["published"] is False
            pub = [x["slug"] for x in requests.get(f"{API}/services").json()]
            assert s0["slug"] not in pub
            assert requests.get(f"{API}/services/{s0['slug']}").status_code == 404
        finally:
            r = admin.put(f"{API}/admin/services/{s0['slug']}", json=body)
            assert r.status_code == 200 and r.json()["description"] == s0["description"]
        slugs = [x["slug"] for x in svcs]
        swapped = [slugs[1], slugs[0]] + slugs[2:]
        try:
            assert admin.post(f"{API}/admin/services/reorder", json={"slugs": swapped}).status_code == 200
            assert [x["slug"] for x in admin.get(f"{API}/admin/services").json()][:2] == swapped[:2]
        finally:
            assert admin.post(f"{API}/admin/services/reorder", json={"slugs": slugs}).status_code == 200
        assert admin.post(f"{API}/admin/services/reorder", json={"slugs": slugs[:-1]}).status_code == 422

    def test_content_save_roundtrip(self, admin):
        c = requests.get(f"{API}/content").json()
        r = admin.put(f"{API}/admin/content", json=c)
        assert r.status_code == 200
        assert requests.get(f"{API}/content").json() == c
