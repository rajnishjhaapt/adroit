import pytest
pytest.skip("Legacy Clerk-token suite; Clerk removed - see test_custom_auth.py", allow_module_level=True)
# Iteration 2: new services (Audit & Assurance, Trust Registration), partners, vision/mission/core values, admin editing
import copy
import uuid
from datetime import date, timedelta
import requests
from conftest import BASE_URL, auth, fwd, CREATED_REFS

API = f"{BASE_URL}/api"
ORIGINAL = [
    ("GST Services", 7), ("Accounting Services", 8), ("Company Incorporation & Business Structure", 8),
    ("PF & ESIC Services", 7), ("Business Licences & Registrations", 8), ("Tax Appeal Services", 7),
    ("Income Tax & GST Notice Management", 7), ("TDS Services", 7), ("Business Loan & Banking Finance", 10),
    ("E-Commerce Accounting & Reconciliation Services", 14),
]
AUDIT_SUBS = ["Statutory Audit", "Tax Audit", "Internal Audit", "Bank Audit", "Stock Audit", "Payroll Audit",
              "Concurrent Audit", "Management Audit", "Revenue Audit", "Compliance Audit", "Due Diligence & Special"]
TRUST_SUBS = ["Public Charitable Trust Formation", "Private Trust Formation", "Religious & Educational Trust Formation",
              "Trust Deed Drafting & Registration", "Trustee & Settlor Documentation", "PAN & TAN Application",
              "12AB Registration", "80G Registration", "NGO Darpan Registration", "CSR-1 Registration",
              "FCRA Registration Assistance", "Trust Accounting & Bookkeeping", "Trust Audit & ITR Filing",
              "Annual Compliance & Tax Advisory", "Trust Deed Amendment & Trustee Changes"]
DESIG = "Partner – Adroit Management and Tax Consultants"
QUOTES = {
    "awdhesh-jha": "Success is not just about building a business; it’s about building trust, creating value and making a lasting impact.",
    "arun-rana": "Great leadership is not about being ahead of others; it is about bringing out the best in everyone.",
    "ajay-kumar": "True success is achieved when knowledge meets dedication and every effort creates lasting value.",
}
VALUES = [("Integrity", "Upholding honesty and professional ethics."),
          ("Trust", "Building long-term relationships through transparency."),
          ("Excellence", "Delivering quality in every assignment."),
          ("Commitment", "Putting our clients’ interests first."),
          ("Innovation", "Adopting smarter and practical solutions."),
          ("Growth", "Creating value for clients, businesses and society.")]
VISION = "To become a trusted and leading professional consultancy firm, recognised for excellence, integrity and innovation in Audit, Taxation and Business Advisory. We aspire to empower businesses and entrepreneurs with the right guidance, helping them achieve sustainable growth and long-term success."
MISSION = "Our mission is to deliver reliable, transparent and result-oriented professional services that create real value for our clients. We are committed to providing practical financial solutions, maintaining the highest standards of professional ethics and building lasting relationships through trust, knowledge and dedication."


# --- Services list & detail
class TestServices:
    def test_twelve_in_order(self):
        s = requests.get(f"{API}/services", timeout=15).json()
        assert len(s) == 12
        assert [(x["name"], len(x["sub_services"])) for x in s[:10]] == ORIGINAL
        assert s[10]["name"] == "Audit & Assurance Services" and s[10]["sub_services"] == AUDIT_SUBS
        assert s[11]["name"] == "Trust Registration, Formation & Compliance Services" and s[11]["sub_services"] == TRUST_SUBS
        assert s[10]["description"] == "Comprehensive audit, assurance and risk management services to ensure financial accuracy, transparency and regulatory compliance."
        assert s[11]["description"] == "Complete solutions for trust formation, registration, taxation and compliance."
        assert s[10]["cta"] == "Schedule a Call with an Audit & Assurance Expert"
        assert s[11]["cta"] == "Schedule a Call with a Trust Formation Expert"

    def test_detail(self):
        for slug in ["audit-assurance-services", "trust-registration-formation-compliance"]:
            r = requests.get(f"{API}/services/{slug}", timeout=15)
            assert r.status_code == 200 and r.json()["slug"] == slug

    def test_sitemap_includes_new(self):
        t = requests.get(f"{API}/sitemap.xml", timeout=15).text
        assert "/services/audit-assurance-services" in t and "/services/trust-registration-formation-compliance" in t


# --- Content: partners, firms, vision/mission, core values
class TestContent:
    def test_partners(self):
        c = requests.get(f"{API}/content", timeout=15).json()
        assert [p["slug"] for p in c["partners"]] == list(QUOTES)
        for p in c["partners"]:
            assert p["designation"] == DESIG and p["quote"] == QUOTES[p["slug"]] and len(p["bio"]) == 2
        assert "Swati Gupta" not in [p["name"] for p in c["partners"]]
        assert [f["name"] for f in c["firms"]] == ["AMKN & Associates", "DMD & Associates", "Swati Gupta & Company"]

    def test_about(self):
        c = requests.get(f"{API}/content", timeout=15).json()
        assert c["vision"] == VISION and c["mission"] == MISSION
        assert [(v["title"], v["text"]) for v in c["core_values"]] == VALUES

    def test_services_intro_mentions_count(self):
        c = requests.get(f"{API}/content", timeout=15).json()
        assert not c["services_intro"].lower().startswith("ten "), f"services_intro stale: {c['services_intro']}"


# --- Admin editing
class TestAdmin:
    def test_admin_services_lists_new(self):
        r = requests.get(f"{API}/admin/services", headers=auth("admin"), timeout=15)
        slugs = [s["slug"] for s in r.json()]
        assert "audit-assurance-services" in slugs and "trust-registration-formation-compliance" in slugs

    def test_edit_new_service_and_revert(self):
        h = auth("admin")
        orig = requests.get(f"{API}/services/trust-registration-formation-compliance", timeout=15).json()
        body = {k: orig[k] for k in ["name", "description", "icon", "cta", "sub_services", "intro", "who_needs", "process", "documents", "faqs", "published"]}
        mod = {**body, "sub_services": body["sub_services"] + ["TEST_Sub"]}
        try:
            r = requests.put(f"{API}/admin/services/trust-registration-formation-compliance", json=mod, headers=h, timeout=15)
            assert r.status_code == 200 and "TEST_Sub" in r.json()["sub_services"]
            assert "TEST_Sub" in requests.get(f"{API}/services/trust-registration-formation-compliance", timeout=15).json()["sub_services"]
        finally:
            r = requests.put(f"{API}/admin/services/trust-registration-formation-compliance", json=body, headers=h, timeout=15)
            assert r.status_code == 200 and r.json()["sub_services"] == TRUST_SUBS

    def test_content_noop_save_roundtrip(self):
        h = auth("admin")
        before = requests.get(f"{API}/content", timeout=15).json()
        r = requests.put(f"{API}/admin/content", json=before, headers=h, timeout=15)
        assert r.status_code == 200
        after = requests.get(f"{API}/content", timeout=15).json()
        assert after == before

    def test_partner_slug_autogen_and_revert(self):
        h = auth("admin")
        before = requests.get(f"{API}/content", timeout=15).json()
        mod = copy.deepcopy(before)
        mod["partners"].append({"slug": "", "name": "TEST Partner", "designation": DESIG, "quote": "q", "bio": ["b"], "photo_url": ""})
        try:
            r = requests.put(f"{API}/admin/content", json=mod, headers=h, timeout=15)
            assert r.status_code == 200 and r.json()["partners"][-1]["slug"] == "test-partner"
        finally:
            requests.put(f"{API}/admin/content", json=before, headers=h, timeout=15)
        assert requests.get(f"{API}/content", timeout=15).json() == before

    def test_bad_photo_url_rejected(self):
        before = requests.get(f"{API}/content", timeout=15).json()
        mod = copy.deepcopy(before)
        mod["partners"][0]["photo_url"] = "javascript:alert(1)"
        r = requests.put(f"{API}/admin/content", json=mod, headers=auth("admin"), timeout=15)
        assert r.status_code == 422

    def test_content_put_requires_admin(self):
        before = requests.get(f"{API}/content", timeout=15).json()
        assert requests.put(f"{API}/admin/content", json=before, timeout=15).status_code == 401
        assert requests.put(f"{API}/admin/content", json=before, headers=auth("staff"), timeout=15).status_code == 403


# --- Booking with a new service (creates 1 TEST_ enquiry, cleaned by conftest)
class TestBooking:
    def test_booking_trust(self):
        p = {"kind": "booking", "full_name": "TEST_Trust Booking", "mobile": "9876500002", "email": "",
             "service": "Trust Registration, Formation & Compliance Services",
             "preferred_date": (date.today() + timedelta(days=3)).isoformat(), "preferred_time": "11:00 AM",
             "message": "", "consent": True, "submission_key": uuid.uuid4().hex, "website": ""}
        r = requests.post(f"{API}/enquiries", json=p, headers=fwd(), timeout=20)
        assert r.status_code == 200, r.text
        CREATED_REFS.append(r.json()["reference"])
        assert r.json()["reference"].startswith("ADR-")
