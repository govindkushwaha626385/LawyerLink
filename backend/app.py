from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModel
from sentence_transformers import SentenceTransformer
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import hf_hub_download
import torch, numpy as np, json, pickle, pandas as pd, faiss, sys, os
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI()

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sys.modules["faiss.swigfaiss_avx2"] = faiss

# ✅ Monkey-patch: register BertSdpaSelfAttention as alias so pickle files
# saved with transformers>=4.40 can load correctly with older versions.
import transformers.models.bert.modeling_bert as _bert_module
if not hasattr(_bert_module, "BertSdpaSelfAttention"):
    _bert_module.BertSdpaSelfAttention = _bert_module.BertSelfAttention

# Recommendation model files
rec_repo = "govindkushwaha6263/recommodation-model"

faiss_index_path = hf_hub_download(repo_id=rec_repo, filename="faiss_index.pkl")
cases_data_path = hf_hub_download(repo_id=rec_repo, filename="cases_data.pkl")
sentence_model_path = hf_hub_download(repo_id=rec_repo, filename="sentence_model.pkl")

# ✅ Try to extract model name from pickle metadata, then load fresh
# (avoids tokenizer version incompatibilities from pickled models)
try:
    with open(sentence_model_path, "rb") as f:
        _raw = pickle.load(f)
    # SentenceTransformer stores model path in ._model_card_data or similar attrs
    _model_name = getattr(_raw, '_model_card_data', None)
    if _model_name and hasattr(_model_name, 'base_model'):
        rec_model = SentenceTransformer(_model_name.base_model)
    else:
        # Fall back: re-load fresh using the repo directly
        rec_model = SentenceTransformer("all-MiniLM-L6-v2")
    print("✅ Recommendation model loaded successfully")
except Exception as _e:
    print(f"⚠️ Could not load pickled model ({_e}), falling back to all-MiniLM-L6-v2")
    rec_model = SentenceTransformer("all-MiniLM-L6-v2")

# Load FAISS index
with open(faiss_index_path, "rb") as f:
    index = pickle.load(f)

# Load DataFrame
df = pd.read_pickle(cases_data_path)


chat_repo = "govindkushwaha6263/Legal-AI-Chatbot"

embeddings_path = hf_hub_download(repo_id=chat_repo, filename="embeddings.npy")
metadata_path = hf_hub_download(repo_id=chat_repo, filename="metadata.json")

# Load base transformer model
tokenizer = AutoTokenizer.from_pretrained(chat_repo)
legal_model = AutoModel.from_pretrained(chat_repo)

# Move to GPU if available
device = "cuda" if torch.cuda.is_available() else "cpu"
legal_model.to(device)
legal_model.eval()

# Load embeddings + metadata
embeddings = np.load(embeddings_path)
with open(metadata_path, "r", encoding="utf-8") as f:
    metadata = json.load(f)

class RecommendQuery(BaseModel):
    text: str
    top_k: int = 10

@app.post("/recommend/")
def recommend_cases(query: RecommendQuery):
    try:
        # encode() in sentence-transformers 3.x returns a tensor by default
        embedding = rec_model.encode([query.text])
        # Ensure it's a numpy float32 array for FAISS
        query_embedding = np.array(embedding, dtype=np.float32)
        distances, indices = index.search(query_embedding, query.top_k)

        results = []
        for i, idx in enumerate(indices[0]):
            case_info = {
                "Case_ID": int(df.iloc[idx]["ID"]) if isinstance(df.iloc[idx]["ID"], (np.integer,)) else df.iloc[idx]["ID"],
                "Score": float(1 / (1 + float(distances[0][i]))),
                "Summary": str(df.iloc[idx]["Summary"]),
                "Judgment": str(df.iloc[idx]["Judgment"])
            }
            results.append(case_info)
        return {"results": results}
    except Exception as e:
        import traceback
        return {"error": str(e), "trace": traceback.format_exc(), "results": []}

class QuestionQuery(BaseModel):
    question: str

def get_embedding(text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=512)
    inputs = {k: v.to(device) for k, v in inputs.items()}
    with torch.no_grad():
        outputs = legal_model(**inputs)
    return outputs.last_hidden_state[:, 0, :].squeeze().cpu().numpy()

@app.post("/ask/")
def ask_legal_question(query: QuestionQuery):
    query_emb = get_embedding(query.question)
    sims = cosine_similarity([query_emb], embeddings)[0]
    best_idx = np.argmax(sims)
    best = metadata[best_idx]
    return {"answer": best["answer"], "domain": best["domain"]}


# ─────────────────────────────────────────────
# ✦ Smart Lawyer Matching Endpoint
# ─────────────────────────────────────────────
class LawyerInfo(BaseModel):
    id: str
    name: str
    category: str
    experience: int = 0

class MatchQuery(BaseModel):
    problem: str
    lawyers: list[LawyerInfo]
    top_k: int = 3

@app.post("/match-lawyers/")
def match_lawyers(query: MatchQuery):
    try:
        if not query.lawyers:
            return {"matches": []}

        # Encode the problem
        problem_emb = rec_model.encode([query.problem], convert_to_numpy=True)

        # Encode each lawyer description (category + name)
        lawyer_texts = [f"{l.category} lawyer with {l.experience} years experience" for l in query.lawyers]
        lawyer_embs = rec_model.encode(lawyer_texts, convert_to_numpy=True)

        # Cosine similarity
        from sklearn.metrics.pairwise import cosine_similarity as cos_sim
        sims = cos_sim(problem_emb, lawyer_embs)[0]

        # Rank and return top-k
        ranked = sorted(enumerate(sims), key=lambda x: x[1], reverse=True)[:query.top_k]
        results = [
            {"id": query.lawyers[i].id, "name": query.lawyers[i].name, "score": float(score)}
            for i, score in ranked
        ]
        return {"matches": results}
    except Exception as e:
        import traceback
        return {"error": str(e), "trace": traceback.format_exc(), "matches": []}


# ─────────────────────────────────────────────
# ✦ Hearing Date Email Reminders (APScheduler)
# ─────────────────────────────────────────────
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import date, timedelta

# Email config — set these as environment variables in production
EMAIL_SENDER = "govindkushwahabusiness@gmail.com"
EMAIL_PASSWORD = "clbe pkra rxcb bzbn"   # Use Gmail App Password

def send_reminder_email(to_email: str, case_title: str, hearing_date: str, role: str):
    """Send a hearing reminder email to a lawyer or litigant."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"⚖️ Hearing Reminder: {case_title} — Tomorrow"
        msg["From"] = f"LawyerLink <{EMAIL_SENDER}>"
        msg["To"] = to_email

        html = f"""
        <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#f8faff;border-radius:20px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1a2744,#243460);padding:30px 28px;text-align:center;">
            <h1 style="color:white;font-size:1.4rem;margin:0;">⚖️ LawyerLink</h1>
          </div>
          <div style="padding:28px;">
            <h2 style="color:#1a2744;font-size:1.1rem;">📅 Hearing Reminder</h2>
            <p style="color:#374151;font-size:0.95rem;">Dear {role},</p>
            <p style="color:#374151;">This is a reminder that you have a hearing <strong>tomorrow</strong> for the following case:</p>
            <div style="background:white;border-left:4px solid #c9a84c;border-radius:10px;padding:16px 18px;margin:20px 0;">
              <p style="color:#1a2744;font-weight:700;font-size:1rem;margin:0 0 6px;">{case_title}</p>
              <p style="color:#6b7280;font-size:0.85rem;margin:0;">📅 Hearing Date: <strong>{hearing_date}</strong></p>
            </div>
            <p style="color:#6b7280;font-size:0.85rem;">Please be prepared and arrive on time.</p>
            <p style="color:#9ca3af;font-size:0.75rem;margin-top:24px;">— LawyerLink Automated Reminder</p>
          </div>
        </div>
        """
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.sendmail(EMAIL_SENDER, to_email, msg.as_string())
        print(f"✅ Reminder sent to {to_email} for case: {case_title}")
    except Exception as e:
        print(f"❌ Email send failed to {to_email}: {e}")


def check_hearings_and_remind():
    """Scheduled job: check cases with hearing tomorrow and send emails."""
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore as admin_firestore

        # Initialize Firebase Admin SDK (use service account key)
        if not firebase_admin._apps:
            # Try to use default credentials (set GOOGLE_APPLICATION_CREDENTIALS env var)
            # or place serviceAccountKey.json in the backend folder
            import os
            sa_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
            if os.path.exists(sa_path):
                cred = credentials.Certificate(sa_path)
                firebase_admin.initialize_app(cred)
            else:
                print("⚠️ No serviceAccountKey.json found — email reminders skipped.")
                return

        admin_db = admin_firestore.client()
        tomorrow = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")

        cases_ref = admin_db.collection("cases")
        docs = cases_ref.where("next_hearing_date", "==", tomorrow).stream()

        for d in docs:
            c = d.to_dict()
            title = c.get("title", "Your Case")
            lawyer_email = c.get("lawyerEmail")
            client_email = c.get("clientEmail")
            if lawyer_email:
                send_reminder_email(lawyer_email, title, tomorrow, "Lawyer")
            if client_email:
                send_reminder_email(client_email, title, tomorrow, "Client")
    except Exception as e:
        print(f"❌ Reminder job error: {e}")


# ── Start scheduler ──
try:
    from apscheduler.schedulers.background import BackgroundScheduler
    scheduler = BackgroundScheduler()
    scheduler.add_job(check_hearings_and_remind, "cron", hour=8, minute=0)  # Daily at 8 AM
    scheduler.start()
    print("✅ Hearing reminder scheduler started (runs daily at 8:00 AM)")
except ImportError:
    print("⚠️ APScheduler not installed — install with: pip install apscheduler")


@app.post("/test-reminder/")
def test_reminder():
    """Manually trigger the reminder check (for testing)."""
    check_hearings_and_remind()
    return {"status": "Reminder check triggered"}
