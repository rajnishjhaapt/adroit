# Shared fixtures: base URL, cookie-session login helpers (custom admin auth, Clerk removed), DB handle, cleanup
import os
import uuid
import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient

_fe = dotenv_values("/app/frontend/.env")
_be = dotenv_values("/app/backend/.env")
BASE_URL = _fe["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "dhrubj49@gmail.com"
ADMIN_PASSWORD = "n9eJ4r-RlGeix-60cLue"


def fwd():
    return {"X-Forwarded-For": f"10.{uuid.uuid4().int % 250}.{uuid.uuid4().int % 250}.{uuid.uuid4().int % 250}"}


def db():
    return MongoClient(_be["MONGO_URL"])[_be["DB_NAME"]]


def login(email, password):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, headers=fwd(), timeout=30)
    return s, r


CREATED_REFS = []
CREATED_USER_IDS = []


@pytest.fixture(scope="session")
def admin():
    s, r = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code} {r.text}")
    yield s
    s.post(f"{API}/auth/logout")


@pytest.fixture(scope="session", autouse=True)
def cleanup():
    yield
    d = db()
    if CREATED_REFS:
        d.enquiries.delete_many({"reference": {"$in": CREATED_REFS}, "full_name": {"$regex": "^TEST_"}})
    if CREATED_USER_IDS:
        d.sessions.delete_many({"user_id": {"$in": CREATED_USER_IDS}})
        emails = [u["email"] for u in d.users.find({"user_id": {"$in": CREATED_USER_IDS}}, {"email": 1, "_id": 0})]
        d.login_failures.delete_many({"email": {"$in": emails}})
        d.users.delete_many({"user_id": {"$in": CREATED_USER_IDS}, "name": {"$regex": "^TEST_"}})
