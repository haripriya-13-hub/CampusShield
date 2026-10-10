"""Optional: create demo accounts. Run once with `python seed.py`."""
import sqlite3
from werkzeug.security import generate_password_hash
from app import DB_PATH, init_db, now_iso

init_db()
db = sqlite3.connect(DB_PATH)
for name, email, pw, role in [
    ("Demo Student", "student@campus.edu", "Student@123", "student"),
    ("Demo Admin", "admin@campus.edu", "Admin@123", "admin"),
]:
    if not db.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
        db.execute(
            "INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?,?,?,?,?)",
            (name, email, generate_password_hash(pw), role, now_iso()),
        )
db.commit()
print("Demo accounts ready:")
print("  student@campus.edu / Student@123")
print("  admin@campus.edu  / Admin@123")
