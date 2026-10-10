"""
CampusShield AI - text classification + duplicate detection.

Algorithms
- TF-IDF (unigrams + bigrams) turns complaint text into numbers.
- Logistic Regression predicts the department (IT / Maintenance / Security)
  and the priority (High / Medium / Low). Two separate models.
- A small safety rule forces High priority when the text contains clear danger words
  (fire, leak, harassment, theft...). This is a hybrid: ML plus a safety net.
- Duplicate detection uses cosine similarity between TF-IDF vectors.

Run `python ml_model.py` to retrain and print cross-validated accuracy.
"""
import os
import re
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model.joblib")

# (complaint text, department, priority)
DATA = [
    # ---------------- IT ----------------
    ("wifi not working in the library", "IT", "Medium"),
    ("internet is very slow in the hostel", "IT", "Medium"),
    ("no network connection in lab 2", "IT", "Medium"),
    ("wifi keeps disconnecting in classroom", "IT", "Medium"),
    ("lab computers not booting black screen", "IT", "Medium"),
    ("computer in lab shows blue screen", "IT", "Medium"),
    ("cannot login to college portal", "IT", "Medium"),
    ("student portal is down not loading", "IT", "High"),
    ("exam server not responding during online test", "IT", "High"),
    ("lms website not opening", "IT", "Medium"),
    ("printer in the department is not working", "IT", "Low"),
    ("projector software not detecting laptop", "IT", "Low"),
    ("keyboard and mouse not working on lab pc", "IT", "Low"),
    ("email id not working need password reset", "IT", "Low"),
    ("software not installed in computer lab", "IT", "Low"),
    ("router in the seminar hall is off", "IT", "Medium"),
    ("wifi password not accepted", "IT", "Low"),
    ("campus network down in all blocks", "IT", "High"),
    ("lab pc keeps restarting by itself", "IT", "Medium"),
    ("internet not available in library second floor", "IT", "Medium"),
    ("biometric attendance machine not connecting to network", "IT", "Medium"),
    ("website of the college is not loading", "IT", "Medium"),
    # ---------------- Maintenance ----------------
    ("water pipe leaking in hostel washroom", "Maintenance", "High"),
    ("tap leaking continuously near canteen", "Maintenance", "Medium"),
    ("ceiling fan not working in classroom", "Maintenance", "Low"),
    ("tube light fused in corridor", "Maintenance", "Low"),
    ("projector bulb not working in room a204", "Maintenance", "Low"),
    ("broken bench in classroom", "Maintenance", "Low"),
    ("toilet flush not working in block b", "Maintenance", "Medium"),
    ("no water supply in hostel", "Maintenance", "High"),
    ("drainage blocked and overflowing near hostel", "Maintenance", "High"),
    ("lift not working in main block", "Maintenance", "Medium"),
    ("air conditioner not cooling in seminar hall", "Maintenance", "Low"),
    ("door lock broken in classroom", "Maintenance", "Low"),
    ("window glass broken in lab", "Maintenance", "Medium"),
    ("power cut in the hostel since morning", "Maintenance", "High"),
    ("electric switch board sparking in room", "Maintenance", "High"),
    ("water cooler not working in corridor", "Maintenance", "Low"),
    ("garbage not cleared near canteen", "Maintenance", "Medium"),
    ("classroom is very dirty needs cleaning", "Maintenance", "Low"),
    ("roof leaking inside classroom when it rains", "Maintenance", "High"),
    ("wall paint peeling in corridor", "Maintenance", "Low"),
    ("street light not working in campus road", "Maintenance", "Medium"),
    ("water tank overflowing behind hostel", "Maintenance", "Medium"),
    ("broken tiles in corridor people may slip", "Maintenance", "Medium"),
    ("blackboard is damaged in room 101", "Maintenance", "Low"),
    # ---------------- Security ----------------
    ("suspicious person standing near parking area", "Security", "High"),
    ("bike stolen from the parking lot", "Security", "High"),
    ("fight between students near canteen", "Security", "High"),
    ("harassment of a girl student near the gate", "Security", "High"),
    ("ragging of juniors in hostel", "Security", "High"),
    ("unknown person entering the hostel at night", "Security", "High"),
    ("cctv camera not working at main gate", "Security", "Medium"),
    ("main gate security guard not present", "Security", "Medium"),
    ("lost mobile phone in the library", "Security", "Low"),
    ("lost id card near the ground", "Security", "Low"),
    ("students smoking behind the library", "Security", "Medium"),
    ("stray dogs near hostel gate attacking students", "Security", "Medium"),
    ("outsiders entering campus without id check", "Security", "High"),
    ("laptop stolen from the classroom", "Security", "High"),
    ("area behind the block is dark and unsafe at night", "Security", "High"),
    ("drunk person creating trouble near the gate", "Security", "High"),
    ("vehicles speeding inside campus", "Security", "Medium"),
    ("emergency light not working near girls hostel", "Security", "Medium"),
    ("someone threatened me in the corridor", "Security", "High"),
    ("found a bag left unattended near the lab", "Security", "Medium"),
    ("parking area gate lock broken", "Security", "Medium"),
    ("lost wallet in the canteen", "Security", "Low"),
    ("unauthorised vehicle parked in staff area", "Security", "Low"),
]

DEPARTMENTS = ["IT", "Maintenance", "Security"]
PRIORITIES = ["High", "Medium", "Low"]

HIGH_RISK = re.compile(
    r"\b(fire|smoke|spark\w*|short circuit|shock|gas|flood\w*|harass\w*|ragging|assault\w*|"
    r"theft|stolen|steal|suspicious|fight\w*|weapon\w*|injur\w*|unsafe|stranger|drunk|threat\w*|"
    r"stuck in (the )?lift|pipe leak\w*|leaking pipe)\b",
    re.IGNORECASE,
)

_models = None


def _build():
    return make_pipeline(
        TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, lowercase=True),
        LogisticRegression(max_iter=3000, C=10),
    )


def train(save=True, verbose=False):
    texts = [d[0] for d in DATA]
    dept_y = [d[1] for d in DATA]
    pri_y = [d[2] for d in DATA]
    dept_model, pri_model = _build(), _build()
    dept_model.fit(texts, dept_y)
    pri_model.fit(texts, pri_y)
    if verbose:
        d_acc = cross_val_score(_build(), texts, dept_y, cv=5).mean()
        p_acc = cross_val_score(_build(), texts, pri_y, cv=5).mean()
        print(f"Samples: {len(DATA)}")
        print(f"Department accuracy (5-fold CV): {d_acc:.2f}")
        print(f"Priority accuracy   (5-fold CV): {p_acc:.2f}")
    models = {"dept": dept_model, "priority": pri_model}
    if save:
        joblib.dump(models, MODEL_PATH)
    return models


def load():
    global _models
    if _models is None:
        if os.path.exists(MODEL_PATH):
            try:
                _models = joblib.load(MODEL_PATH)
            except Exception:
                _models = train()
        else:
            _models = train()
    return _models


def classify(text):
    """Return {'dept', 'priority', 'confidence'} for a complaint."""
    m = load()
    text = (text or "").strip().lower()
    dept_proba = m["dept"].predict_proba([text])[0]
    dept_idx = dept_proba.argmax()
    dept = m["dept"].classes_[dept_idx]
    confidence = float(dept_proba[dept_idx])

    priority = m["priority"].predict([text])[0]
    if HIGH_RISK.search(text):
        priority = "High"
    return {"dept": str(dept), "priority": str(priority), "confidence": round(confidence, 2)}


def find_duplicates(text, candidates, threshold=0.35, limit=3):
    """candidates: list of dicts with id, title, description. Returns the most similar ones."""
    if not candidates or not text.strip():
        return []
    docs = [text] + [f"{c['title']} {c['description']}" for c in candidates]
    try:
        vecs = TfidfVectorizer(stop_words="english").fit_transform(docs)
    except ValueError:  # only stop words / empty vocabulary
        return []
    sims = cosine_similarity(vecs[0:1], vecs[1:])[0]
    ranked = sorted(zip(sims, candidates), key=lambda x: x[0], reverse=True)
    return [
        {"id": c["id"], "title": c["title"], "similarity": round(float(s), 2)}
        for s, c in ranked[:limit]
        if s >= threshold
    ]


if __name__ == "__main__":
    train(save=True, verbose=True)
    print(classify("water pipe leaking in hostel"))
    print(classify("wifi not working in library"))
    print(classify("suspicious person near parking"))
