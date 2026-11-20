# Shared fixtures: base URL, Clerk session tokens for role test users, cleanup of TEST_ enquiries
import os
import uuid
import pytest
import requests
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv("/app/backend/.env")
load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
CLERK = "https://api.clerk.com/v1"
H = {"Authorization": f"Bearer {os.environ['CLERK_SECRET_KEY']}", "User-Agent": "emergent-test"}
USERS = {
    "admin": "user_3MNWLk3VxlUTj6nRyKPQ9C9wzMO",
    "staff": "user_3MNWLo0THJv1X4XskvihMfxxQwA",
    "pending": "user_3MNWLpR3bail9hhEnvrSHBpLwXw",
}
_sessions = {}


def token_for(role: str) -> str:
    if role not in _sessions:
        r = requests.post(f"{CLERK}/sessions", headers=H, json={"user_id": USERS[role]}, timeout=15)
        r.raise_for_status()
        _sessions[role] = r.json()["id"]
    r = requests.post(f"{CLERK}/sessions/{_sessions[role]}/tokens", headers=H, json={"expires_in_seconds": 600}, timeout=15)
    r.raise_for_status()
    return r.json()["jwt"]


def auth(role):
    return {"Authorization": f"Bearer {token_for(role)}"}


def fwd():
    return {"X-Forwarded-For": f"10.{uuid.uuid4().int % 250}.{uuid.uuid4().int % 250}.{uuid.uuid4().int % 250}"}


def db():
    return MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]


CREATED_REFS = []


@pytest.fixture(scope="session", autouse=True)
def cleanup():
    yield
    d = db()
    if CREATED_REFS:
        d.enquiries.delete_many({"reference": {"$in": CREATED_REFS}, "full_name": {"$regex": "^TEST_"}})
    for sid in _sessions.values():
        requests.post(f"{CLERK}/sessions/{sid}/revoke", headers=H, timeout=15)
