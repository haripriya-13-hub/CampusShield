# CampusShield AI - Frontend (React + Vite)

Needs the Flask backend running (see campusshield-backend).

## Run both (two terminals)
Terminal 1 - backend:
    cd campusshield-backend
    venv\Scripts\activate
    python app.py
Terminal 2 - frontend:
    cd campusshield-frontend
    npm install
    npm run dev
Open http://localhost:5173

## Accounts
Register a student, or run `python seed.py` in the backend for demo accounts:
  student@campus.edu / Student@123     admin@campus.edu / Admin@123
Admin registration needs the admin code (default CAMPUS-ADMIN).

The frontend calls the backend through the Vite proxy in vite.config.js (/api and /uploads -> port 5000).
