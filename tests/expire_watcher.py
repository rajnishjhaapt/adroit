# Test helper: expires admin sessions created after start (6s after creation), then deletes them at the end.
import os, time
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
start = datetime.now(timezone.utc)
touched = set()
end = time.time() + int(os.environ.get("WATCH_SECS", "150"))
while time.time() < end:
    now = datetime.now(timezone.utc)
    for s in db.sessions.find({"user_id": "admin", "created_at": {"$gt": start, "$lt": now - timedelta(seconds=6)}}):
        if s["token_hash"] not in touched:
            db.sessions.update_one({"token_hash": s["token_hash"]}, {"$set": {"expires_at": now - timedelta(hours=1)}})
            touched.add(s["token_hash"])
            print("expired", s["token_hash"][:10], flush=True)
    time.sleep(0.5)
for h in touched:
    db.sessions.delete_one({"token_hash": h})
print("cleaned", len(touched), flush=True)
