# CampusShield AI - Flask Backend

## Run (Windows PowerShell)
    cd campusshield-backend
    python -m venv venv
    venv\Scripts\activate
    pip install -r requirements.txt
    python app.py
Server: http://localhost:5000  (check http://localhost:5000/api/health)

Optional demo accounts:  python seed.py
Admin sign-up needs the admin code (default CAMPUS-ADMIN). Change it with the ADMIN_CODE environment variable.

## Retrain / check the AI
    python ml_model.py        (prints cross-validated accuracy)
Add more example complaints to DATA in ml_model.py, delete model.joblib, and restart.

## API
POST /api/register, /api/login          GET /api/me          PUT /api/profile
GET  /api/reports   POST /api/reports (multipart, student)   GET /api/reports/<id>
PATCH /api/reports/<id>/status (admin)   POST /api/duplicates   GET /api/track/<id>
GET  /api/audit, /api/analytics (admin)  GET /api/notifications  POST /api/notifications/read
All except register/login/health need header:  Authorization: Bearer <token>

## Security built in
- Passwords hashed + salted (Werkzeug), generic login error, 5 failed logins -> 15 min lock
- Signed expiring tokens (8 h), role checked on the server for every protected route
- Students can only read their own reports (blocks ID guessing)
- Anonymous reports store no user id; admins never see a reporter; tracking id only
- Parameterized SQL, upload type/size checks with random file names, CORS limited to localhost:5173
