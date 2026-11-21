import asyncio
import csv
import io
import os
import re
import secrets
import logging
import time
import uuid
from collections import defaultdict, deque
from contextlib import suppress
from datetime import datetime, timezone, date
from pathlib import Path
from typing import List, Optional, Literal

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Query, Depends, HTTPException, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel, ReturnDocument
from pymongo.errors import DuplicateKeyError
from pydantic import BaseModel, Field, field_validator

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

try:
    from backend.clerk_auth import clerk_router, require_user
    from backend.notify import notify_new_enquiry
    from backend.seed_data import SERVICES, CONTENT, SERVICES_V2, PARTNERS, ABOUT_V2
except ModuleNotFoundError:
    from clerk_auth import clerk_router, require_user
    from notify import notify_new_enquiry
    from seed_data import SERVICES, CONTENT, SERVICES_V2, PARTNERS, ABOUT_V2

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

INDEXES: dict[str, list[IndexModel]] = {
    "enquiries": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("reference", ASCENDING)], name="reference", unique=True),
        IndexModel([("submission_key", ASCENDING)], name="submission_key", unique=True),
        IndexModel([("created_at", DESCENDING)], name="created_desc"),
        IndexModel([("status", ASCENDING)], name="status"),
        IndexModel([("assigned_to", ASCENDING)], name="assigned_to"),
        IndexModel([("mobile", ASCENDING), ("created_at", DESCENDING)], name="mobile_created"),
    ],
    "services": [
        IndexModel([("slug", ASCENDING)], name="slug", unique=True),
        IndexModel([("order", ASCENDING)], name="order"),
    ],
    "users": [IndexModel([("user_id", ASCENDING)], name="user_id", unique=True)],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)


app = FastAPI()
api_router = APIRouter(prefix="/api")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------- Roles ----------------
ROLES = ["admin", "staff", "pending"]
DEFAULT_ROLE = "pending"
RETIRED_ROLES: dict = {}
RANK = {r: len(ROLES) - i for i, r in enumerate(ROLES)}
ENV = "live" if os.environ.get("CLERK_PUBLISHABLE_KEY", "").startswith("pk_live_") else "preview"
IN_ENV = {"env": {"$in": [ENV, None]}}


def effective_role(role) -> str:
    role = RETIRED_ROLES.get(role, role)
    return role if role in ROLES else DEFAULT_ROLE


def _clerk_user(user_id: str) -> dict:
    r = requests.get(f"https://api.clerk.com/v1/users/{user_id}", timeout=10,
                     headers={"Authorization": f"Bearer {os.environ['CLERK_SECRET_KEY']}", "User-Agent": "emergent-app"})
    r.raise_for_status()
    return r.json()


async def current_member(user: dict = Depends(require_user)) -> dict:
    uid = user["user_id"]
    member = await db.users.find_one({"user_id": uid}, {"_id": 0})
    if member is None or not member.get("role"):
        cu = await asyncio.to_thread(_clerk_user, uid)
        admins = {e.strip().lower() for e in os.environ.get("ADMIN_EMAIL", "").split(",") if e.strip()}
        emails = cu.get("email_addresses", [])
        is_admin = any(e["email_address"].lower() in admins and (e.get("verification") or {}).get("status") == "verified" for e in emails)
        primary = next((e["email_address"] for e in emails if e["id"] == cu.get("primary_email_address_id")),
                       emails[0]["email_address"] if emails else "")
        name = " ".join(filter(None, [cu.get("first_name"), cu.get("last_name")])) or primary
        role = "admin" if is_admin else DEFAULT_ROLE
        await db.users.update_one({"user_id": uid, "role": {"$in": [None, ""]}}, {"$set": {"role": role}})
        member = await db.users.find_one_and_update(
            {"user_id": uid},
            {"$setOnInsert": {"user_id": uid, "role": role, "created_at": now_iso()}, "$set": {"email": primary, "name": name}},
            upsert=True, projection={"_id": 0}, return_document=ReturnDocument.AFTER)
    if member.get("env") != ENV:
        await db.users.update_one({"user_id": uid}, {"$set": {"env": ENV}})
    return {**member, "env": ENV, "role": effective_role(member["role"])}


def require_role(*roles: str):
    async def check(member: dict = Depends(current_member)) -> dict:
        if member["role"] not in roles:
            raise HTTPException(status_code=403, detail="Not allowed")
        return member
    return check


require_admin = require_role("admin")
require_team = require_role("admin", "staff")


# ---------------- Public: content & services ----------------
class WhyItem(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    text: str = Field(max_length=400)


class Firm(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    members: List[str]


class Partner(BaseModel):
    slug: str = ""
    name: str = Field(min_length=1, max_length=120)
    designation: str = Field(default="", max_length=200)
    quote: str = Field(default="", max_length=500)
    bio: List[str] = []
    photo_url: str = Field(default="", max_length=500)

    @field_validator("photo_url")
    @classmethod
    def https_only(cls, v):
        v = (v or "").strip()
        if v and not (v.startswith("https://") or v.startswith("/")):
            raise ValueError("Photo URL must start with https://")
        return v


class SiteContent(BaseModel):
    company_name: str = Field(min_length=1, max_length=120)
    tagline: str = Field(max_length=200)
    experience: str = Field(min_length=1, max_length=10)
    address: str = Field(max_length=300)
    address_2: str = Field(default="", max_length=300)
    phone: str = Field(max_length=30)
    phone_link: str = Field(pattern=r"^\+?\d{8,15}$")
    whatsapp_number: str = Field(pattern=r"^\d{8,15}$")
    hero_headline: str = Field(max_length=200)
    hero_text: str = Field(max_length=500)
    cta_headline: str = Field(max_length=200)
    services_intro: str = Field(max_length=500)
    why_choose: List[WhyItem]
    about_intro: List[str]
    about_approach: str = Field(max_length=1500)
    about_commitment: str = Field(max_length=1500)
    partners: List["Partner"]
    firms: List[Firm]
    vision: str = Field(default="", max_length=2000)
    mission: str = Field(default="", max_length=2000)
    core_values: List[WhyItem] = []


@api_router.get("/content")
async def get_content():
    doc = await db.content.find_one({"id": "site"}, {"_id": 0, "id": 0}) or CONTENT
    return SiteContent(**doc).model_dump()


@api_router.get("/services")
async def list_services():
    return await db.services.find({"published": True}, {"_id": 0}).sort("order", 1).to_list(100)


@api_router.get("/services/{slug}")
async def get_service(slug: str):
    doc = await db.services.find_one({"slug": slug, "published": True}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Service not found")
    return doc


@api_router.get("/sitemap.xml")
async def sitemap(request: Request):
    host = (request.headers.get("x-forwarded-host") or request.headers.get("host", "")).split(",")[0].strip()
    base = f"https://{host}"
    paths = ["/", "/about", "/services", "/team", "/contact", "/schedule-consultation", "/privacy-policy", "/terms-and-conditions"]
    paths += [f"/services/{s['slug']}" async for s in db.services.find({"published": True}, {"slug": 1, "_id": 0})]
    urls = "".join(f"<url><loc>{base}{p}</loc></url>" for p in paths)
    xml = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>'
    return Response(content=xml, media_type="application/xml")


# ---------------- Public: enquiries ----------------
_RATE: dict = defaultdict(deque)
RATE_LIMIT, RATE_WINDOW = 5, 600
MOBILE_RE = re.compile(r"^[6-9]\d{9}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _rate_check(ip: str) -> None:
    q, t = _RATE[ip], time.monotonic()
    while q and t - q[0] > RATE_WINDOW:
        q.popleft()
    if len(q) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many submissions. Please try again after some time or contact us on WhatsApp.")
    q.append(t)


class EnquiryIn(BaseModel):
    kind: Literal["contact", "booking", "service"]
    full_name: str = Field(min_length=2, max_length=100)
    mobile: str = Field(max_length=20)
    email: Optional[str] = Field(default="", max_length=120)
    service: Optional[str] = Field(default="", max_length=200)
    preferred_date: Optional[str] = Field(default="", max_length=10)
    preferred_time: Optional[str] = Field(default="", max_length=20)
    message: str = Field(default="", max_length=2000)
    consent: bool
    submission_key: str = Field(min_length=8, max_length=64)
    website: str = ""

    @field_validator("full_name", "message", "email", "service")
    @classmethod
    def strip(cls, v):
        return (v or "").strip()

    @field_validator("mobile")
    @classmethod
    def valid_mobile(cls, v):
        digits = re.sub(r"\D", "", v or "")
        if len(digits) == 12 and digits.startswith("91"):
            digits = digits[2:]
        elif len(digits) == 11 and digits.startswith("0"):
            digits = digits[1:]
        if not MOBILE_RE.match(digits):
            raise ValueError("Please enter a valid 10-digit mobile number")
        return digits

    @field_validator("email")
    @classmethod
    def valid_email(cls, v):
        if v and not EMAIL_RE.match(v):
            raise ValueError("Please enter a valid email address")
        return v.lower()


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    return fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "")


@api_router.post("/enquiries")
async def create_enquiry(body: EnquiryIn, request: Request):
    if body.website:
        raise HTTPException(status_code=400, detail="Submission rejected")
    if not body.consent:
        raise HTTPException(status_code=422, detail="Please provide your consent to be contacted")
    existing = await db.enquiries.find_one({"submission_key": body.submission_key}, {"_id": 0, "reference": 1})
    if existing:
        return {"reference": existing["reference"], "duplicate": True}
    if body.service:
        if not await db.services.find_one({"name": body.service, "published": True}, {"_id": 1}):
            raise HTTPException(status_code=422, detail="Please select a valid service")
    if body.kind == "booking":
        if not body.service:
            raise HTTPException(status_code=422, detail="Please select a service")
        try:
            d = date.fromisoformat(body.preferred_date or "")
        except ValueError:
            raise HTTPException(status_code=422, detail="Please select a preferred date")
        if d < date.today():
            raise HTTPException(status_code=422, detail="Preferred date cannot be in the past")
        if not body.preferred_time:
            raise HTTPException(status_code=422, detail="Please select a preferred time")
    elif len(body.message) < 5:
        raise HTTPException(status_code=422, detail="Please enter a message")
    _rate_check(_client_ip(request))

    ts = datetime.now(timezone.utc)
    recent = await db.enquiries.find_one(
        {"mobile": body.mobile, "kind": body.kind, "service": body.service, "message": body.message,
         "created_at": {"$gte": datetime.fromtimestamp(ts.timestamp() - 600, timezone.utc).isoformat()}},
        {"_id": 0, "reference": 1})
    if recent:
        return {"reference": recent["reference"], "duplicate": True}

    enq = body.model_dump(exclude={"website", "consent"})
    enq.update({
        "id": str(uuid.uuid4()),
        "reference": f"ADR-{ts:%y%m%d}-{secrets.token_hex(3).upper()}",
        "consent": True, "consent_at": ts.isoformat(),
        "status": "new", "assigned_to": "", "assigned_name": "",
        "notes": [], "history": [{"at": ts.isoformat(), "by": "Website", "action": "Enquiry submitted"}],
        "created_at": ts.isoformat(), "updated_at": ts.isoformat(),
    })
    try:
        await db.enquiries.insert_one(enq)
    except DuplicateKeyError:
        existing = await db.enquiries.find_one({"submission_key": body.submission_key}, {"_id": 0, "reference": 1})
        return {"reference": existing["reference"], "duplicate": True}
    asyncio.create_task(notify_new_enquiry(enq))
    return {"reference": enq["reference"], "duplicate": False}


# ---------------- Admin: me / stats / enquiries ----------------
STATUSES = ["new", "in_progress", "completed"]
STATUS_LABEL = {"new": "New", "in_progress": "In Progress", "completed": "Completed"}


def _scope(member: dict) -> dict:
    return {} if member["role"] == "admin" else {"assigned_to": member["user_id"]}


@api_router.get("/me")
async def me(member: dict = Depends(current_member)):
    return {"user_id": member["user_id"], "role": member["role"], "name": member.get("name", ""), "email": member.get("email", "")}


@api_router.get("/admin/stats")
async def stats(member: dict = Depends(require_team)):
    scope = _scope(member)
    counts = {s: await db.enquiries.count_documents({**scope, "status": s}) for s in STATUSES}
    recent = await db.enquiries.find(scope, {"_id": 0, "notes": 0, "history": 0}).sort("created_at", -1).limit(6).to_list(6)
    return {"total": sum(counts.values()), **counts, "recent": recent}


def _enquiry_filter(member, q, status, kind) -> dict:
    f = dict(_scope(member))
    if status in STATUSES:
        f["status"] = status
    if kind in ("contact", "booking", "service"):
        f["kind"] = kind
    if q:
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        f["$or"] = [{"full_name": rx}, {"mobile": rx}, {"email": rx}, {"reference": rx}, {"service": rx}]
    return f


@api_router.get("/admin/enquiries")
async def list_enquiries(q: str = "", status: str = "", kind: str = "", member: dict = Depends(require_team)):
    return await db.enquiries.find(_enquiry_filter(member, q, status, kind), {"_id": 0}).sort("created_at", -1).to_list(1000)


@api_router.get("/admin/enquiries/export.csv")
async def export_enquiries(q: str = "", status: str = "", kind: str = "", member: dict = Depends(require_team)):
    rows = await db.enquiries.find(_enquiry_filter(member, q, status, kind), {"_id": 0}).sort("created_at", -1).to_list(10000)
    cols = ["reference", "created_at", "kind", "status", "full_name", "mobile", "email", "service",
            "preferred_date", "preferred_time", "message", "assigned_name"]
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(cols)

    def safe(v):
        s = str(v or "")
        return "'" + s if s[:1] in ("=", "+", "-", "@") else s
    for r in rows:
        r["status"] = STATUS_LABEL.get(r.get("status"), r.get("status"))
        w.writerow([safe(r.get(c)) for c in cols])
    return Response(content=buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="adroit-enquiries-{date.today()}.csv"'})


async def _get_scoped(enquiry_id: str, member: dict) -> dict:
    doc = await db.enquiries.find_one({"id": enquiry_id, **_scope(member)}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return doc


@api_router.get("/admin/enquiries/{enquiry_id}")
async def get_enquiry(enquiry_id: str, member: dict = Depends(require_team)):
    return await _get_scoped(enquiry_id, member)


class EnquiryUpdate(BaseModel):
    status: Optional[Literal["new", "in_progress", "completed"]] = None
    assigned_to: Optional[str] = None


@api_router.patch("/admin/enquiries/{enquiry_id}")
async def update_enquiry(enquiry_id: str, body: EnquiryUpdate, member: dict = Depends(require_team)):
    doc = await _get_scoped(enquiry_id, member)
    sets, events = {}, []
    by = member.get("name") or member.get("email") or "Team"
    if body.status and body.status != doc["status"]:
        sets["status"] = body.status
        events.append(f"Status changed to {STATUS_LABEL[body.status]}")
    if body.assigned_to is not None and body.assigned_to != doc.get("assigned_to", ""):
        if member["role"] != "admin":
            raise HTTPException(status_code=403, detail="Only an admin can assign enquiries")
        if body.assigned_to:
            target = await db.users.find_one({"user_id": body.assigned_to, "role": {"$in": ["admin", "staff"]}, **IN_ENV}, {"_id": 0})
            if not target:
                raise HTTPException(status_code=404, detail="Staff member not found")
            sets.update(assigned_to=target["user_id"], assigned_name=target.get("name") or target.get("email", ""))
            events.append(f"Assigned to {sets['assigned_name']}")
        else:
            sets.update(assigned_to="", assigned_name="")
            events.append("Unassigned")
    if not sets:
        return doc
    ts = now_iso()
    sets["updated_at"] = ts
    return await db.enquiries.find_one_and_update(
        {"id": enquiry_id}, {"$set": sets, "$push": {"history": {"$each": [{"at": ts, "by": by, "action": e} for e in events]}}},
        projection={"_id": 0}, return_document=ReturnDocument.AFTER)


class NoteIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


@api_router.post("/admin/enquiries/{enquiry_id}/notes")
async def add_note(enquiry_id: str, body: NoteIn, member: dict = Depends(require_team)):
    await _get_scoped(enquiry_id, member)
    ts, by = now_iso(), member.get("name") or member.get("email") or "Team"
    note = {"id": str(uuid.uuid4()), "text": body.text.strip(), "by": by, "at": ts}
    return await db.enquiries.find_one_and_update(
        {"id": enquiry_id},
        {"$push": {"notes": note, "history": {"at": ts, "by": by, "action": "Internal note added"}}, "$set": {"updated_at": ts}},
        projection={"_id": 0}, return_document=ReturnDocument.AFTER)


@api_router.get("/admin/assignees")
async def assignees(admin: dict = Depends(require_admin)):
    people = await db.users.find({"role": {"$in": ["admin", "staff"]}, **IN_ENV}, {"_id": 0}).to_list(500)
    return [{"user_id": p["user_id"], "name": p.get("name") or p.get("email", ""), "role": p["role"]} for p in people]


# ---------------- Admin: services ----------------
class FaqItem(BaseModel):
    q: str = Field(min_length=1, max_length=300)
    a: str = Field(min_length=1, max_length=2000)


class ServiceIn(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    description: str = Field(max_length=500)
    icon: str = Field(default="Briefcase", max_length=40)
    cta: str = Field(default="Schedule a Consultation", max_length=150)
    sub_services: List[str] = []
    intro: str = Field(default="", max_length=3000)
    who_needs: List[str] = []
    process: List[str] = []
    documents: List[str] = []
    faqs: List[FaqItem] = []
    published: bool = True

    @field_validator("sub_services", "who_needs", "process", "documents")
    @classmethod
    def clean_list(cls, v):
        return [s.strip() for s in v if s and s.strip()]


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:80] or "service"


@api_router.get("/admin/services")
async def admin_services(admin: dict = Depends(require_admin)):
    return await db.services.find({"deleted": {"$ne": True}}, {"_id": 0}).sort("order", 1).to_list(200)


@api_router.post("/admin/services")
async def create_service(body: ServiceIn, admin: dict = Depends(require_admin)):
    slug = base = _slugify(body.name)
    i = 2
    while await db.services.find_one({"slug": slug}, {"_id": 1}):  # includes soft-deleted slugs
        slug, i = f"{base}-{i}", i + 1
    last = await db.services.find({}, {"order": 1, "_id": 0}).sort("order", -1).limit(1).to_list(1)
    doc = {**body.model_dump(), "slug": slug, "order": (last[0]["order"] + 1) if last else 0}
    await db.services.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/admin/services/{slug}")
async def update_service(slug: str, body: ServiceIn, admin: dict = Depends(require_admin)):
    doc = await db.services.find_one_and_update({"slug": slug, "deleted": {"$ne": True}}, {"$set": body.model_dump()},
                                                projection={"_id": 0}, return_document=ReturnDocument.AFTER)
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return doc


@api_router.delete("/admin/services/{slug}")
async def delete_service(slug: str, admin: dict = Depends(require_admin)):
    res = await db.services.update_one({"slug": slug, "deleted": {"$ne": True}},
                                       {"$set": {"deleted": True, "published": False, "deleted_at": now_iso()}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


class ReorderIn(BaseModel):
    slugs: List[str]


@api_router.post("/admin/services/reorder")
async def reorder_services(body: ReorderIn, admin: dict = Depends(require_admin)):
    current = {s["slug"] async for s in db.services.find({"deleted": {"$ne": True}}, {"slug": 1, "_id": 0})}
    if set(body.slugs) != current or len(body.slugs) != len(current):
        raise HTTPException(status_code=422, detail="Reorder list must contain every service exactly once")
    for i, s in enumerate(body.slugs):
        await db.services.update_one({"slug": s}, {"$set": {"order": i}})
    return {"ok": True}


@api_router.put("/admin/content")
async def update_content(body: SiteContent, admin: dict = Depends(require_admin)):
    seen = set()
    for p in body.partners:
        p.slug = base = p.slug or _slugify(p.name)
        i = 2
        while p.slug in seen:
            p.slug, i = f"{base}-{i}", i + 1
        seen.add(p.slug)
    await db.content.update_one({"id": "site"}, {"$set": body.model_dump()}, upsert=True)
    return body.model_dump()


# ---------------- Admin: users ----------------
@api_router.get("/users")
async def list_users(admin: dict = Depends(require_admin)):
    people = await db.users.find(IN_ENV, {"_id": 0}).to_list(1000)
    return {"roles": [r for r in ROLES if RANK[r] <= RANK[admin["role"]]],
            "users": [{**p, "role": effective_role(p.get("role"))} for p in people]}


class RoleIn(BaseModel):
    role: str


@api_router.patch("/users/{user_id}/role")
async def set_role(user_id: str, body: RoleIn, admin: dict = Depends(require_admin)):
    if body.role not in ROLES or RANK[body.role] > RANK[admin["role"]]:
        raise HTTPException(status_code=403, detail="Not allowed")
    target = await db.users.find_one({"user_id": user_id, **IN_ENV}, {"_id": 0})
    if target is None:
        raise HTTPException(status_code=404, detail="Not found")
    if (effective_role(target.get("role")) == "admin" and body.role != "admin"
            and await db.users.count_documents({"role": "admin", **IN_ENV}) <= 1):
        raise HTTPException(status_code=409, detail="Keep at least one admin")
    await db.users.update_one({"user_id": user_id}, {"$set": {"role": body.role}})
    return {"user_id": user_id, "role": body.role}


# ---------------- Startup ----------------
async def seed() -> None:
    if not await db.meta.find_one({"id": "seed_v1"}):
        for i, s in enumerate(SERVICES):
            await db.services.update_one({"slug": s["slug"]}, {"$setOnInsert": {**s, "order": i}}, upsert=True)
        await db.content.update_one({"id": "site"}, {"$setOnInsert": {"id": "site", **CONTENT}}, upsert=True)
        await db.meta.update_one({"id": "seed_v1"}, {"$set": {"id": "seed_v1", "at": now_iso()}}, upsert=True)
    if not await db.meta.find_one({"id": "seed_v2"}):
        last = await db.services.find({}, {"order": 1, "_id": 0}).sort("order", -1).limit(1).to_list(1)
        start = (last[0]["order"] + 1) if last else 0
        for i, s in enumerate(SERVICES_V2):
            await db.services.update_one({"slug": s["slug"]}, {"$setOnInsert": {**s, "order": start + i}}, upsert=True)
        doc = await db.content.find_one({"id": "site"}, {"_id": 0}) or {}
        sets = {k: v for k, v in ABOUT_V2.items() if not doc.get(k)}
        if not doc.get("partners") or isinstance(doc["partners"][0], str):
            sets["partners"] = PARTNERS
        if sets:
            await db.content.update_one({"id": "site"}, {"$set": sets})
        await db.meta.update_one({"id": "seed_v2"}, {"$set": {"id": "seed_v2", "at": now_iso()}}, upsert=True)


app.include_router(api_router)
app.include_router(clerk_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    for old, new in RETIRED_ROLES.items():
        await db.users.update_many({"role": old}, {"$set": {"role": new}})
    await seed()
    app.state.index_task = asyncio.create_task(ensure_indexes())


@app.on_event("shutdown")
async def shutdown_db_client():
    app.state.index_task.cancel()
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    client.close()
