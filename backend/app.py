"""
CampusShield AI - Flask backend
Run:  python app.py        (starts on http://localhost:5000)
"""
import hmac
import os
import re
import sqlite3
import time
import uuid
from datetime import datetime, timedelta, timezone
from functools import wraps

from flask import Flask, g, jsonify, request, send_from_directory
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash

import ml_model

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("DB_PATH", os.path.join(BASE_DIR, "campusshield.db"))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Set these as environment variables in real use.
SECRET_KEY = os.environ.get("SECRET_KEY", "change-this-secret-before-deploying")
ADMIN_CODE = os.environ.get("ADMIN_CODE", "CAMPUS-ADMIN")
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

STEPS = ["Pending", "In Progress", "Fixed"]
ALLOWED_IMAGE_EXT = {"png", "jpg", "jpeg", "gif", "webp"}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
IST = timezone(timedelta(hours=5, minutes=30))

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # 5 MB uploads
signer = URLSafeTimedSerializer(SECRET_KEY, salt="campusshield-auth")


# ---------------------------------------------------------------- database
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(_):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DB_PATH)
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('student','admin')),
            department TEXT DEFAULT '',
            year TEXT DEFAULT '',
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            building TEXT NOT NULL,
            lat REAL, lng REAL,
            status TEXT NOT NULL DEFAULT 'Pending',
            priority TEXT NOT NULL,
            dept TEXT NOT NULL,
            confidence REAL,
            anonymous INTEGER NOT NULL DEFAULT 0,
            tracking_id TEXT UNIQUE,
            user_id INTEGER REFERENCES users(id),
            photo TEXT,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS status_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER NOT NULL REFERENCES reports(id),
            status TEXT NOT NULL,
            at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id INTEGER NOT NULL REFERENCES users(id),
            admin_name TEXT NOT NULL,
            report_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            audience TEXT NOT NULL,          -- 'admin' or 'user'
            user_id INTEGER REFERENCES users(id),
            text TEXT NOT NULL,
            at TEXT NOT NULL,
            read INTEGER NOT NULL DEFAULT 0
        );
        """
    )
    db.commit()
    db.close()


# ---------------------------------------------------------------- helpers
def now_iso():
    return datetime.now(IST).isoformat(timespec="seconds")


def fmt(iso):
    if not iso:
        return None
    return datetime.fromisoformat(iso).strftime("%d %b, %I:%M %p").lstrip("0")


def err(message, code=400):
    return jsonify({"error": message}), code


def clean(value, max_len):
    return (value or "").strip()[:max_len]


def user_dict(u):
    return {"id": u["id"], "name": u["name"], "email": u["email"], "role": u["role"],
            "department": u["department"], "year": u["year"]}


def make_token(user_id):
    return signer.dumps({"uid": user_id})


def auth_required(*roles):
    def deco(fn):
        @wraps(fn)
        def wrapper(*a, **kw):
            header = request.headers.get("Authorization", "")
            if not header.startswith("Bearer "):
                return err("Login required", 401)
            try:
                data = signer.loads(header[7:], max_age=8 * 3600)
            except SignatureExpired:
                return err("Session expired. Please log in again.", 401)
            except BadSignature:
                return err("Invalid token", 401)
            user = get_db().execute("SELECT * FROM users WHERE id = ?", (data["uid"],)).fetchone()
            if user is None:
                return err("Account not found", 401)
            if roles and user["role"] not in roles:  # role check happens on the server
                return err("You are not allowed to do this", 403)
            g.user = user
            return fn(*a, **kw)
        return wrapper
    return deco


# simple in-memory login throttle: 5 failed attempts per 15 minutes per (ip, email)
FAILED = {}


def throttled(key):
    now = time.time()
    FAILED[key] = [t for t in FAILED.get(key, []) if now - t < 900]
    return len(FAILED[key]) >= 5


def report_dict(row, viewer):
    db = get_db()
    hist = db.execute("SELECT status, at FROM status_history WHERE report_id = ? ORDER BY id", (row["id"],)).fetchall()
    latest = {h["status"]: h["at"] for h in hist}
    out = {
        "id": row["id"],
        "title": row["title"],
        "desc": row["description"],
        "building": row["building"],
        "status": row["status"],
        "priority": row["priority"],
        "dept": row["dept"],
        "confidence": row["confidence"],
        "anonymous": bool(row["anonymous"]),
        "pin": [row["lat"], row["lng"]] if row["lat"] is not None else None,
        "photo": f"/uploads/{row['photo']}" if row["photo"] else None,
        "times": [fmt(latest.get(s)) for s in STEPS],
        "owner": "me" if viewer["role"] == "student" else "other",
    }
    if viewer["role"] == "admin" and not row["anonymous"] and row["user_id"]:
        u = db.execute("SELECT name FROM users WHERE id = ?", (row["user_id"],)).fetchone()
        out["reporter"] = u["name"] if u else None  # anonymous reports never expose a reporter
    return out


def notify_admins(text):
    get_db().execute("INSERT INTO notifications (audience, text, at) VALUES ('admin', ?, ?)", (text, now_iso()))


def notify_user(user_id, text):
    if user_id:
        get_db().execute("INSERT INTO notifications (audience, user_id, text, at) VALUES ('user', ?, ?, ?)",
                         (user_id, text, now_iso()))


# ---------------------------------------------------------------- CORS + security headers
@app.after_request
def add_headers(resp):
    origin = request.headers.get("Origin", "")
    if origin in ALLOWED_ORIGINS:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, OPTIONS"
        resp.headers["Vary"] = "Origin"
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    return resp


@app.errorhandler(404)
def not_found(_):
    return err("Not found", 404)


@app.errorhandler(413)
def too_large(_):
    return err("File is too large (max 5 MB)", 413)


@app.errorhandler(500)
def server_error(_):
    return err("Something went wrong on the server", 500)


# ---------------------------------------------------------------- auth
@app.post("/api/register")
def register():
    d = request.get_json(silent=True) or {}
    name, email = clean(d.get("name"), 80), clean(d.get("email"), 120).lower()
    password, role = d.get("password") or "", d.get("role", "student")

    if not name:
        return err("Name is required")
    if not EMAIL_RE.match(email):
        return err("Enter a valid email")
    if len(password) < 8:
        return err("Password must be at least 8 characters")
    if role not in ("student", "admin"):
        return err("Invalid role")
    if role == "admin" and not hmac.compare_digest(str(d.get("admin_code", "")), ADMIN_CODE):
        return err("Wrong admin code", 403)

    db = get_db()
    if db.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
        return err("An account with this email already exists", 409)

    cur = db.execute(
        "INSERT INTO users (name, email, password_hash, role, department, year, created_at) VALUES (?,?,?,?,?,?,?)",
        (name, email, generate_password_hash(password), role, clean(d.get("department"), 80), clean(d.get("year"), 20), now_iso()),
    )
    db.commit()
    user = db.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify({"token": make_token(user["id"]), "user": user_dict(user)}), 201


@app.post("/api/login")
def login():
    d = request.get_json(silent=True) or {}
    email, password = clean(d.get("email"), 120).lower(), d.get("password") or ""
    key = (request.remote_addr, email)
    if throttled(key):
        return err("Too many failed attempts. Try again in 15 minutes.", 429)

    user = get_db().execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if user is None or not check_password_hash(user["password_hash"], password):
        FAILED.setdefault(key, []).append(time.time())
        return err("Wrong email or password", 401)  # same message for both cases
    FAILED.pop(key, None)
    return jsonify({"token": make_token(user["id"]), "user": user_dict(user)})


@app.get("/api/me")
@auth_required()
def me():
    return jsonify({"user": user_dict(g.user)})


@app.put("/api/profile")
@auth_required()
def update_profile():
    d = request.get_json(silent=True) or {}
    name = clean(d.get("name"), 80) or g.user["name"]
    db = get_db()
    db.execute("UPDATE users SET name = ?, department = ?, year = ? WHERE id = ?",
               (name, clean(d.get("department"), 80), clean(d.get("year"), 20), g.user["id"]))
    db.commit()
    user = db.execute("SELECT * FROM users WHERE id = ?", (g.user["id"],)).fetchone()
    return jsonify({"user": user_dict(user)})


# ---------------------------------------------------------------- reports
@app.get("/api/reports")
@auth_required()
def list_reports():
    db = get_db()
    if g.user["role"] == "admin":
        rows = db.execute("SELECT * FROM reports ORDER BY id DESC").fetchall()
    else:
        rows = db.execute("SELECT * FROM reports WHERE user_id = ? ORDER BY id DESC", (g.user["id"],)).fetchall()
    return jsonify({"reports": [report_dict(r, g.user) for r in rows]})


@app.post("/api/reports")
@auth_required("student")
def create_report():
    f = request.form if request.form else (request.get_json(silent=True) or {})
    title, desc = clean(f.get("title"), 120), clean(f.get("description") or f.get("desc"), 2000)
    building = clean(f.get("building"), 60)
    if len(title) < 3:
        return err("Title must be at least 3 characters")
    if len(desc) < 5:
        return err("Please describe the problem")
    if not building:
        return err("Building is required")

    try:
        lat = float(f["lat"]) if f.get("lat") not in (None, "") else None
        lng = float(f["lng"]) if f.get("lng") not in (None, "") else None
    except ValueError:
        return err("Invalid map location")
    if lat is not None and not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return err("Invalid map location")

    photo_name = None
    photo = request.files.get("photo")
    if photo and photo.filename:
        ext = photo.filename.rsplit(".", 1)[-1].lower() if "." in photo.filename else ""
        if ext not in ALLOWED_IMAGE_EXT or not (photo.mimetype or "").startswith("image/"):
            return err("Only image files (png, jpg, gif, webp) are allowed")
        photo_name = f"{uuid.uuid4().hex}.{ext}"  # random name, original name is never used
        photo.save(os.path.join(UPLOAD_DIR, photo_name))

    anonymous = str(f.get("anonymous", "")).lower() in ("1", "true", "on", "yes")
    ai = ml_model.classify(f"{title} {desc}")
    tracking_id = "CS-" + uuid.uuid4().hex[:6].upper() if anonymous else None

    db = get_db()
    cur = db.execute(
        """INSERT INTO reports (title, description, building, lat, lng, status, priority, dept, confidence,
                                anonymous, tracking_id, user_id, photo, created_at)
           VALUES (?,?,?,?,?,'Pending',?,?,?,?,?,?,?,?)""",
        (title, desc, building, lat, lng, ai["priority"], ai["dept"], ai["confidence"], int(anonymous),
         tracking_id, None if anonymous else g.user["id"], photo_name, now_iso()),
    )
    rid = cur.lastrowid
    db.execute("INSERT INTO status_history (report_id, status, at) VALUES (?, 'Pending', ?)", (rid, now_iso()))
    notify_admins(f"New {ai['priority']} priority report ({ai['dept']}): {title}")
    db.commit()

    row = db.execute("SELECT * FROM reports WHERE id = ?", (rid,)).fetchone()
    out = report_dict(row, g.user)
    if anonymous:
        out["owner"] = "me"  # shown once to the submitter
        out["trackingId"] = tracking_id
    return jsonify({"report": out, "ai": ai, "trackingId": tracking_id}), 201


@app.get("/api/reports/<int:rid>")
@auth_required()
def get_report(rid):
    row = get_db().execute("SELECT * FROM reports WHERE id = ?", (rid,)).fetchone()
    if row is None:
        return err("Report not found", 404)
    if g.user["role"] == "student" and row["user_id"] != g.user["id"]:
        return err("Report not found", 404)  # students cannot read other people's reports
    return jsonify({"report": report_dict(row, g.user)})


@app.patch("/api/reports/<int:rid>/status")
@auth_required("admin")
def update_status(rid):
    d = request.get_json(silent=True) or {}
    status = d.get("status")
    if status not in STEPS:
        return err("Invalid status")
    db = get_db()
    row = db.execute("SELECT * FROM reports WHERE id = ?", (rid,)).fetchone()
    if row is None:
        return err("Report not found", 404)
    if row["status"] == status:
        return jsonify({"report": report_dict(row, g.user)})

    labels = {"Pending": "To-Do", "In Progress": "Doing", "Fixed": "Done"}
    db.execute("UPDATE reports SET status = ? WHERE id = ?", (status, rid))
    db.execute("INSERT INTO status_history (report_id, status, at) VALUES (?,?,?)", (rid, status, now_iso()))
    db.execute("INSERT INTO audit_log (admin_id, admin_name, report_id, action, at) VALUES (?,?,?,?,?)",
               (g.user["id"], g.user["name"], rid, f"moved \u201c{row['title']}\u201d to {labels[status]}", now_iso()))
    notify_user(row["user_id"], f"Your report \u201c{row['title']}\u201d is now {status}")
    db.commit()
    row = db.execute("SELECT * FROM reports WHERE id = ?", (rid,)).fetchone()
    return jsonify({"report": report_dict(row, g.user)})


@app.post("/api/duplicates")
@auth_required("student")
def duplicates():
    d = request.get_json(silent=True) or {}
    text = clean(d.get("title"), 200) + " " + clean(d.get("description"), 500)
    rows = get_db().execute(
        "SELECT id, title, description FROM reports WHERE status != 'Fixed' AND (? = '' OR building = ?)",
        (clean(d.get("building"), 60), clean(d.get("building"), 60)),
    ).fetchall()
    found = ml_model.find_duplicates(text, [dict(r) for r in rows])
    # students only see the titles of similar open reports, never who reported them
    return jsonify({"duplicates": found})


@app.get("/api/track/<tracking_id>")
@auth_required()
def track(tracking_id):
    row = get_db().execute("SELECT * FROM reports WHERE tracking_id = ?", (tracking_id.upper(),)).fetchone()
    if row is None:
        return err("No report found for this tracking ID", 404)
    r = report_dict(row, {"role": "student"})
    return jsonify({"report": {k: r[k] for k in ("id", "title", "status", "priority", "dept", "building", "times")}})


# ---------------------------------------------------------------- admin
@app.get("/api/audit")
@auth_required("admin")
def audit():
    rows = get_db().execute("SELECT * FROM audit_log ORDER BY id DESC LIMIT 100").fetchall()
    return jsonify({"log": [{"who": r["admin_name"], "what": r["action"], "at": fmt(r["at"])} for r in rows]})


@app.get("/api/analytics")
@auth_required("admin")
def analytics():
    db = get_db()
    by_status = {s: 0 for s in STEPS}
    for r in db.execute("SELECT status, COUNT(*) c FROM reports GROUP BY status"):
        by_status[r["status"]] = r["c"]
    by_building = {r["building"]: r["c"] for r in
                   db.execute("SELECT building, COUNT(*) c FROM reports GROUP BY building ORDER BY c DESC")}
    by_dept = {d: 0 for d in ml_model.DEPARTMENTS}
    for r in db.execute("SELECT dept, COUNT(*) c FROM reports GROUP BY dept"):
        by_dept[r["dept"]] = r["c"]
    return jsonify({"byStatus": by_status, "byBuilding": by_building, "byDept": by_dept})


# ---------------------------------------------------------------- notifications
@app.get("/api/notifications")
@auth_required()
def notifications():
    db = get_db()
    if g.user["role"] == "admin":
        rows = db.execute("SELECT * FROM notifications WHERE audience = 'admin' ORDER BY id DESC LIMIT 50").fetchall()
    else:
        rows = db.execute("SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50",
                          (g.user["id"],)).fetchall()
    return jsonify({"notifications": [{"id": r["id"], "text": r["text"], "at": fmt(r["at"]), "read": bool(r["read"])} for r in rows]})


@app.post("/api/notifications/read")
@auth_required()
def notifications_read():
    db = get_db()
    if g.user["role"] == "admin":
        db.execute("UPDATE notifications SET read = 1 WHERE audience = 'admin'")
    else:
        db.execute("UPDATE notifications SET read = 1 WHERE user_id = ?", (g.user["id"],))
    db.commit()
    return jsonify({"ok": True})


# ---------------------------------------------------------------- uploads + health
@app.get("/uploads/<path:name>")
def uploaded(name):
    return send_from_directory(UPLOAD_DIR, name)  # send_from_directory blocks path traversal


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


init_db()
ml_model.load()  # trains the model on first start (takes a second)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
