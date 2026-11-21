# Backend regression tests: public content/services, enquiries (validation, honeypot, dedupe, rate limit), admin RBAC & workflows
import uuid
import concurrent.futures as cf
from datetime import date, timedelta
import requests
from conftest import BASE_URL, auth, fwd, db, CREATED_REFS

API = f"{BASE_URL}/api"
EXPECTED = {
    "GST Services": 7, "Accounting Services": 8, "Company Incorporation & Business Structure": 8,
    "PF & ESIC Services": 7, "Business Licences & Registrations": 8, "Tax Appeal Services": 7,
    "Income Tax & GST Notice Management": 7, "TDS Services": 7, "Business Loan & Banking Finance": 10,
    "E-Commerce Accounting & Reconciliation Services": 14,
    "Audit & Assurance Services": 11, "Trust Registration, Formation & Compliance Services": 15,
}


def payload(**kw):
    p = {"kind": "contact", "full_name": "TEST_User", "mobile": "9876500001", "email": "", "service": "",
         "message": f"TEST message {uuid.uuid4().hex[:6]}", "consent": True, "submission_key": uuid.uuid4().hex, "website": ""}
    p.update(kw)
    return p


def post(p, ip=None):
    h = ip or fwd()
    r = requests.post(f"{API}/enquiries", json=p, headers=h, timeout=20)
    if r.status_code == 200:
        CREATED_REFS.append(r.json()["reference"])
    return r


# --- Public content & services
class TestPublic:
    def test_services(self):
        r = requests.get(f"{API}/services", timeout=15)
        assert r.status_code == 200
        got = {s["name"]: len(s["sub_services"]) for s in r.json()}
        assert got == EXPECTED

    def test_service_detail_and_404(self):
        assert requests.get(f"{API}/services/gst-services").json()["name"] == "GST Services"
        assert requests.get(f"{API}/services/nope-x").status_code == 404

    def test_content_experience(self):
        c = requests.get(f"{API}/content").json()
        assert c["experience"].startswith("18")
        assert "11+" not in str(c)


# --- Public enquiries
class TestEnquiries:
    def test_honeypot(self):
        assert post(payload(website="http://spam")).status_code == 400

    def test_consent_required(self):
        assert post(payload(consent=False)).status_code == 422

    def test_invalid_mobile(self):
        assert post(payload(mobile="12345")).status_code == 422

    def test_booking_past_date(self):
        p = payload(kind="booking", service="GST Services", preferred_date=str(date.today() - timedelta(days=1)), preferred_time="11:00 AM")
        r = post(p)
        assert r.status_code == 422 and "past" in r.text

    def test_booking_missing_service_time(self):
        d = str(date.today() + timedelta(days=3))
        assert post(payload(kind="booking", preferred_date=d, preferred_time="11:00 AM")).status_code == 422
        assert post(payload(kind="booking", service="GST Services", preferred_date=d)).status_code == 422

    def test_invalid_service(self):
        assert post(payload(service="Fake Service")).status_code == 422

    def test_same_submission_key(self):
        p = payload(full_name="TEST_Dedupe", mobile="9876500002")
        r1 = post(p)
        assert r1.status_code == 200 and r1.json()["reference"].startswith("ADR-")
        r2 = post(p)
        assert r2.status_code == 200 and r2.json()["reference"] == r1.json()["reference"] and r2.json()["duplicate"]

    def test_concurrent_double_submit(self):
        p = payload(kind="booking", full_name="TEST_Concurrent", mobile="9876500003", service="TDS Services",
                    preferred_date=str(date.today() + timedelta(days=4)), preferred_time="10:00 AM")
        ip = fwd()
        with cf.ThreadPoolExecutor(4) as ex:
            res = list(ex.map(lambda _: requests.post(f"{API}/enquiries", json=p, headers=ip, timeout=20), range(4)))
        codes = [r.status_code for r in res]
        for r in res:
            if r.status_code == 200:
                CREATED_REFS.append(r.json()["reference"])
        n = db().enquiries.count_documents({"submission_key": p["submission_key"]})
        assert n == 1
        assert all(c == 200 for c in codes), f"codes={codes}"

    def test_rate_limit(self):
        ip = fwd()
        p = payload(full_name="TEST_Rate", mobile="9876500004", message="TEST rate limit message")
        codes = []
        for _ in range(6):
            codes.append(post({**p, "submission_key": uuid.uuid4().hex}, ip).status_code)
        assert codes[:5] == [200] * 5 and codes[5] == 429, codes


# --- Admin RBAC & workflows
class TestAdmin:
    def _new_enq(self):
        r = post(payload(full_name="TEST_Admin_Flow", mobile="9876500005", service="GST Services"))
        assert r.status_code == 200
        return db().enquiries.find_one({"reference": r.json()["reference"]})["id"]

    def test_no_token(self):
        assert requests.get(f"{API}/admin/stats").status_code == 401
        assert requests.get(f"{API}/admin/enquiries").status_code == 401

    def test_pending_forbidden(self):
        h = auth("pending")
        assert requests.get(f"{API}/me", headers=h).json()["role"] == "pending"
        assert requests.get(f"{API}/admin/stats", headers=h).status_code == 403
        assert requests.get(f"{API}/admin/enquiries", headers=h).status_code == 403

    def test_staff_restrictions(self):
        h = auth("staff")
        for path in ["/admin/services", "/users", "/admin/assignees"]:
            assert requests.get(f"{API}{path}", headers=h).status_code == 403, path
        c = requests.get(f"{API}/content").json()
        assert requests.put(f"{API}/admin/content", json=c, headers=h).status_code == 403

    def test_full_workflow(self):
        eid = self._new_enq()
        a, s = auth("admin"), auth("staff")
        # staff can't see unassigned
        assert requests.get(f"{API}/admin/enquiries/{eid}", headers=s).status_code == 404
        assert eid not in [e["id"] for e in requests.get(f"{API}/admin/enquiries", headers=s).json()]
        # admin stats & search
        st = requests.get(f"{API}/admin/stats", headers=a).json()
        assert st["total"] >= 1 and len(st["recent"]) >= 1
        found = requests.get(f"{API}/admin/enquiries", params={"q": "TEST_Admin_Flow"}, headers=a).json()
        assert any(e["id"] == eid for e in found)
        assert all(e["status"] == "new" for e in requests.get(f"{API}/admin/enquiries", params={"status": "new"}, headers=a).json())
        # status + assign
        staff_id = "user_3MNWLo0THJv1X4XskvihMfxxQwA"
        r = requests.patch(f"{API}/admin/enquiries/{eid}", json={"status": "in_progress", "assigned_to": staff_id}, headers=a)
        assert r.status_code == 200 and r.json()["status"] == "in_progress" and r.json()["assigned_to"] == staff_id
        assert len(r.json()["history"]) == 3
        # staff now sees it, can update status & note, cannot reassign
        assert requests.get(f"{API}/admin/enquiries/{eid}", headers=s).status_code == 200
        assert requests.patch(f"{API}/admin/enquiries/{eid}", json={"assigned_to": ""}, headers=s).status_code == 403
        r = requests.patch(f"{API}/admin/enquiries/{eid}", json={"status": "completed"}, headers=s)
        assert r.status_code == 200 and r.json()["status"] == "completed"
        r = requests.post(f"{API}/admin/enquiries/{eid}/notes", json={"text": "TEST note"}, headers=a)
        assert r.status_code == 200 and r.json()["notes"][-1]["text"] == "TEST note"
        g = requests.get(f"{API}/admin/enquiries/{eid}", headers=a).json()
        assert len(g["history"]) == 5 and g["status"] == "completed"
        # csv
        r = requests.get(f"{API}/admin/enquiries/export.csv", headers=a)
        assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv") and "reference" in r.text.splitlines()[0]
        # staff stats scoped
        assert requests.get(f"{API}/admin/stats", headers=s).json()["total"] >= 1
        # invalid assignee
        assert requests.patch(f"{API}/admin/enquiries/{eid}", json={"assigned_to": "user_pending_x"}, headers=a).status_code == 404

    def test_users_list(self):
        r = requests.get(f"{API}/users", headers=auth("admin"))
        assert r.status_code == 200 and set(r.json()["roles"]) == {"admin", "staff", "pending"}
        assert len(r.json()["users"]) >= 3

    def test_service_edit_hide_revert(self):
        a = auth("admin")
        svc = next(x for x in requests.get(f"{API}/admin/services", headers=a).json() if x["slug"] == "tds-services")
        body = {k: svc[k] for k in ["name", "description", "icon", "cta", "sub_services", "intro", "who_needs", "process", "documents", "faqs", "published"]}
        try:
            r = requests.put(f"{API}/admin/services/tds-services", json={**body, "cta": "TEST_CTA", "published": False}, headers=a)
            assert r.status_code == 200
            assert requests.get(f"{API}/services/tds-services").status_code == 404
            assert len(requests.get(f"{API}/services").json()) == 9
        finally:
            requests.put(f"{API}/admin/services/tds-services", json=body, headers=a)
        assert requests.get(f"{API}/services/tds-services").json()["cta"] == svc["cta"]

    def test_reorder_revert(self):
        a = auth("admin")
        slugs = [x["slug"] for x in requests.get(f"{API}/admin/services", headers=a).json()]
        try:
            assert requests.post(f"{API}/admin/services/reorder", json={"slugs": [slugs[1], slugs[0]] + slugs[2:]}, headers=a).status_code == 200
            assert requests.get(f"{API}/services").json()[0]["slug"] == slugs[1]
        finally:
            requests.post(f"{API}/admin/services/reorder", json={"slugs": slugs}, headers=a)
        assert requests.get(f"{API}/services").json()[0]["slug"] == slugs[0]

    def test_content_edit_revert(self):
        a = auth("admin")
        c = requests.get(f"{API}/content").json()
        try:
            r = requests.put(f"{API}/admin/content", json={**c, "hero_headline": "TEST_Headline"}, headers=a)
            assert r.status_code == 200
            assert requests.get(f"{API}/content").json()["hero_headline"] == "TEST_Headline"
        finally:
            requests.put(f"{API}/admin/content", json=c, headers=a)
        assert requests.get(f"{API}/content").json()["hero_headline"] == c["hero_headline"]
