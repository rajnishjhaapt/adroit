"""Generate an ADMIN_PASSWORD_HASH for backend/.env.

Usage:  python3 scripts/make_admin_hash.py
"""
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from auth import hash_password  # noqa: E402

pw = getpass.getpass("New admin password (min. 10 characters): ")
if len(pw) < 10 or pw != getpass.getpass("Repeat password: "):
    sys.exit("Passwords must match and be at least 10 characters.")
print(f"ADMIN_PASSWORD_HASH={hash_password(pw)}")
