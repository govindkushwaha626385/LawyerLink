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
# ✦ Email Notification System
# ─────────────────────────────────────────────
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import date, timedelta
import os

# Email config
EMAIL_SENDER   = "govindkushwahabusiness@gmail.com"
EMAIL_PASSWORD = "clbe pkra rxcb bzbn"  # Gmail App Password


def build_email_html(recipient_name: str, role: str, case_title: str,
                     case_id: str, hearing_date: str, lawyer_name: str = "",
                     opponent: str = "", court: str = ""):
    """Build a premium HTML email template for hearing reminders."""
    return f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- ═══ Header ═══ -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a2744 0%,#243460 100%);padding:32px 36px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:0.5px;">⚖️ LawyerLink</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.6);font-size:13px;letter-spacing:1px;text-transform:uppercase;">Hearing Reminder</p>
          </td>
        </tr>

        <!-- ═══ Alert Banner ═══ -->
        <tr>
          <td style="background:linear-gradient(90deg,#c9a84c,#e8c96d);padding:12px 36px;text-align:center;">
            <p style="margin:0;color:#1a2744;font-size:14px;font-weight:700;">📅 You have a hearing scheduled for TOMORROW</p>
          </td>
        </tr>

        <!-- ═══ Body ═══ -->
        <tr>
          <td style="padding:36px;">
            <p style="color:#1a2744;font-size:16px;margin:0 0 20px;line-height:1.6;">
              Dear <strong>{recipient_name or role}</strong>,
            </p>
            <p style="color:#4b5563;font-size:14px;margin:0 0 24px;line-height:1.7;">
              This is an automated reminder that you have a hearing scheduled for
              <strong style="color:#1a2744;">tomorrow ({hearing_date})</strong>.
              Please ensure you are prepared with all necessary documents and information.
            </p>

            <!-- Case Info Card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faff;border:1px solid #e5e7eb;border-left:4px solid #c9a84c;border-radius:12px;margin:0 0 24px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 4px;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;font-weight:600;">Case Details</p>
                <p style="margin:0 0 14px;color:#1a2744;font-size:18px;font-weight:700;">{case_title}</p>
                <table cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding:6px 0;color:#6b7280;font-size:13px;" width="130">📋 Case ID</td>
                    <td style="padding:6px 0;color:#1a2744;font-size:13px;font-weight:600;">{case_id or '—'}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#6b7280;font-size:13px;">📅 Hearing Date</td>
                    <td style="padding:6px 0;color:#1a2744;font-size:13px;font-weight:600;">{hearing_date}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#6b7280;font-size:13px;">👤 Your Role</td>
                    <td style="padding:6px 0;color:#1a2744;font-size:13px;font-weight:600;">{role}</td>
                  </tr>
                  {"<tr><td style='padding:6px 0;color:#6b7280;font-size:13px;'>👨‍⚖️ Lawyer</td><td style='padding:6px 0;color:#1a2744;font-size:13px;font-weight:600;'>" + lawyer_name + "</td></tr>" if lawyer_name else ""}
                </table>
              </td></tr>
            </table>

            <!-- Checklist -->
            <p style="color:#1a2744;font-size:14px;font-weight:700;margin:0 0 10px;">📝 Pre-Hearing Checklist:</p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr><td style="padding:4px 0;color:#4b5563;font-size:13px;">✅ Review all case documents and evidence</td></tr>
              <tr><td style="padding:4px 0;color:#4b5563;font-size:13px;">✅ Prepare any required submissions or affidavits</td></tr>
              <tr><td style="padding:4px 0;color:#4b5563;font-size:13px;">✅ Confirm appointment with your lawyer</td></tr>
              <tr><td style="padding:4px 0;color:#4b5563;font-size:13px;">✅ Carry valid ID proof and case reference number</td></tr>
              <tr><td style="padding:4px 0;color:#4b5563;font-size:13px;">✅ Arrive at least 30 minutes early</td></tr>
            </table>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:8px 0 16px;">
                <a href="https://lawyer-link-frontend.vercel.app" style="display:inline-block;background:linear-gradient(135deg,#1a2744,#243460);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:700;letter-spacing:0.5px;">
                  View Case on LawyerLink →
                </a>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- ═══ Footer ═══ -->
        <tr>
          <td style="background:#f8faff;border-top:1px solid #e5e7eb;padding:24px 36px;text-align:center;">
            <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;">This is an automated reminder from LawyerLink</p>
            <p style="margin:0 0 6px;color:#9ca3af;font-size:11px;">⚖️ LawyerLink — Connecting Justice, Empowering Rights</p>
            <p style="margin:0;color:#d1d5db;font-size:10px;">© {date.today().year} LawyerLink. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""


def send_reminder_email(to_email: str, case_title: str, hearing_date: str,
                        role: str, case_id: str = "", recipient_name: str = "",
                        lawyer_name: str = ""):
    """Send a hearing reminder email."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"⚖️ Hearing Tomorrow: {case_title} — {hearing_date}"
        msg["From"]    = f"LawyerLink <{EMAIL_SENDER}>"
        msg["To"]      = to_email

        html = build_email_html(
            recipient_name=recipient_name,
            role=role,
            case_title=case_title,
            case_id=case_id,
            hearing_date=hearing_date,
            lawyer_name=lawyer_name,
        )
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.sendmail(EMAIL_SENDER, to_email, msg.as_string())
        print(f"✅ Reminder sent to {to_email} for case: {case_title}")
        return True
    except Exception as e:
        print(f"❌ Email send failed to {to_email}: {e}")
        return False


def _init_firebase():
    """Initialize Firebase Admin SDK if not already done."""
    import firebase_admin
    from firebase_admin import credentials
    if not firebase_admin._apps:
        sa_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
        if os.path.exists(sa_path):
            cred = credentials.Certificate(sa_path)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase Admin SDK initialized")
        else:
            raise FileNotFoundError("serviceAccountKey.json not found in backend/")


def check_hearings_and_remind():
    """Scheduled job: check cases with hearing tomorrow and send emails."""
    try:
        _init_firebase()
        from firebase_admin import firestore as admin_firestore

        admin_db = admin_firestore.client()
        tomorrow = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")
        print(f"🔍 Checking hearings for {tomorrow}...")

        cases_ref = admin_db.collection("cases")
        docs = list(cases_ref.where("next_hearing_date", "==", tomorrow).stream())
        print(f"📋 Found {len(docs)} case(s) with hearing tomorrow")

        # Build user cache for names
        users_cache = {}

        for d in docs:
            c = d.to_dict()
            title        = c.get("title", "Your Case")
            case_id      = c.get("case_id", "")
            lawyer_email = c.get("lawyerEmail")
            client_email = c.get("clientEmail")
            lawyer_name  = c.get("lawyerName", "")
            lawyer_id    = c.get("lawyerId")
            litigant_id  = c.get("litigantId")

            # Get names from users collection if not cached
            for uid in [lawyer_id, litigant_id]:
                if uid and uid not in users_cache:
                    try:
                        u_doc = admin_db.collection("users").document(uid).get()
                        if u_doc.exists:
                            users_cache[uid] = u_doc.to_dict().get("fullName", "")
                    except:
                        pass

            lawyer_display = users_cache.get(lawyer_id, lawyer_name) or "Your Lawyer"
            client_display = users_cache.get(litigant_id, "") or "Litigant"

            if lawyer_email:
                send_reminder_email(
                    to_email=lawyer_email, case_title=title, hearing_date=tomorrow,
                    role="Lawyer", case_id=case_id, recipient_name=lawyer_display,
                )
            if client_email:
                send_reminder_email(
                    to_email=client_email, case_title=title, hearing_date=tomorrow,
                    role="Litigant", case_id=case_id, recipient_name=client_display,
                    lawyer_name=lawyer_display,
                )

        print(f"✅ Reminder job completed — {len(docs)} case(s) processed")
    except Exception as e:
        import traceback
        print(f"❌ Reminder job error: {e}")
        traceback.print_exc()


# ── Start scheduler ──
try:
    from apscheduler.schedulers.background import BackgroundScheduler
    scheduler = BackgroundScheduler()
    scheduler.add_job(check_hearings_and_remind, "cron", hour=8, minute=0)
    scheduler.start()
    print("✅ Hearing reminder scheduler started (runs daily at 8:00 AM)")
except ImportError:
    print("⚠️ APScheduler not installed — install with: pip install apscheduler")


# ── Test Endpoints ──
@app.post("/test-reminder/")
def test_reminder():
    """Manually trigger the reminder check for tomorrow's hearings."""
    check_hearings_and_remind()
    return {"status": "Reminder check triggered — see server logs"}


class TestEmailRequest(BaseModel):
    email: str
    case_title: str = "Property Dispute — Sharma vs. Gupta"
    hearing_date: str = ""

@app.post("/send-test-email/")
def send_test_email(req: TestEmailRequest):
    """Send a test email to verify the email system works."""
    hearing = req.hearing_date or (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")
    success = send_reminder_email(
        to_email=req.email,
        case_title=req.case_title,
        hearing_date=hearing,
        role="Litigant",
        case_id="TEST-001",
        recipient_name="Test User",
        lawyer_name="Adv. Govind Kushwaha",
    )
    return {"status": "sent" if success else "failed", "to": req.email}


# ─────────────────────────────────────────────
# ✦ Case Added Email Notification
# ─────────────────────────────────────────────
class CaseAddedEmailRequest(BaseModel):
    client_email: str
    client_name: str = "Client"
    lawyer_name: str = ""
    lawyer_email: str = ""
    case_id: str = ""
    case_title: str = ""
    category: str = ""
    description: str = ""
    status: str = "Open"
    next_hearing_date: str = ""
    client_phone: str = ""


def build_case_added_email(req: CaseAddedEmailRequest) -> str:
    hearing_row = f"""
        <tr>
            <td style="padding:7px 0;color:#6b7280;font-size:13px;" width="150">📅 Next Hearing</td>
            <td style="padding:7px 0;color:#1a2744;font-size:13px;font-weight:600;">{req.next_hearing_date}</td>
        </tr>""" if req.next_hearing_date else ""

    desc_block = f"""
        <p style="margin:0 0 8px;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;font-weight:600;">Case Description</p>
        <p style="margin:0;color:#374151;font-size:13px;line-height:1.7;">{req.description}</p>""" if req.description else ""

    return f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a2744 0%,#243460 100%);padding:32px 36px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">⚖️ LawyerLink</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.6);font-size:13px;letter-spacing:1px;text-transform:uppercase;">New Case Registered</p>
          </td>
        </tr>

        <!-- Banner -->
        <tr>
          <td style="background:linear-gradient(90deg,#c9a84c,#e8c96d);padding:12px 36px;text-align:center;">
            <p style="margin:0;color:#1a2744;font-size:14px;font-weight:700;">📁 A new case has been added to your account</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px;">
            <p style="color:#1a2744;font-size:16px;margin:0 0 20px;">Dear <strong>{req.client_name}</strong>,</p>
            <p style="color:#4b5563;font-size:14px;margin:0 0 28px;line-height:1.7;">
              Your lawyer <strong style="color:#1a2744;">{req.lawyer_name}</strong> has registered a new case on your behalf on the LawyerLink platform.
              Below are the complete details of your case.
            </p>

            <!-- Case Card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faff;border:1px solid #e5e7eb;border-left:4px solid #c9a84c;border-radius:12px;margin:0 0 24px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 4px;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;font-weight:600;">Case Information</p>
                <p style="margin:0 0 16px;color:#1a2744;font-size:20px;font-weight:700;">{req.case_title}</p>
                <table cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding:7px 0;color:#6b7280;font-size:13px;" width="150">📋 Case ID</td>
                    <td style="padding:7px 0;color:#1a2744;font-size:13px;font-weight:600;">{req.case_id or "—"}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#6b7280;font-size:13px;">⚖️ Category</td>
                    <td style="padding:7px 0;color:#1a2744;font-size:13px;font-weight:600;">{req.category or "—"}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#6b7280;font-size:13px;">📌 Status</td>
                    <td style="padding:7px 0;color:#1a2744;font-size:13px;font-weight:600;">{req.status}</td>
                  </tr>
                  {hearing_row}
                </table>
              </td></tr>
            </table>

            <!-- Description -->
            {"<table width='100%' cellpadding='0' cellspacing='0' style='background:#f8faff;border:1px solid #e5e7eb;border-radius:12px;margin:0 0 24px;'><tr><td style='padding:20px 24px;'>" + desc_block + "</td></tr></table>" if req.description else ""}

            <!-- Lawyer Card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;border:1px solid #e0e7ff;border-radius:12px;margin:0 0 28px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0 0 10px;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;font-weight:600;">Your Lawyer</p>
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:4px 0;color:#6b7280;font-size:13px;" width="80">👨‍⚖️ Name</td>
                    <td style="padding:4px 0;color:#1a2744;font-size:13px;font-weight:600;">{req.lawyer_name}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#6b7280;font-size:13px;">✉️ Email</td>
                    <td style="padding:4px 0;color:#1a2744;font-size:13px;font-weight:600;">{req.lawyer_email}</td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:8px 0 16px;">
                <a href="https://lawyer-link-frontend.vercel.app/litigant"
                   style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8c96d);color:#1a2744;text-decoration:none;padding:15px 40px;border-radius:50px;font-size:14px;font-weight:800;letter-spacing:0.5px;">
                  View My Case Dashboard →
                </a>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8faff;border-top:1px solid #e5e7eb;padding:24px 36px;text-align:center;">
            <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;">This is an automated notification from LawyerLink</p>
            <p style="margin:0 0 6px;color:#9ca3af;font-size:11px;">⚖️ LawyerLink — Connecting Justice, Empowering Rights</p>
            <p style="margin:0;color:#d1d5db;font-size:10px;">© {date.today().year} LawyerLink. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""


@app.post("/send-case-added-email/")
def send_case_added_email(req: CaseAddedEmailRequest):
    """Send a case registration email to the client when a lawyer adds a case."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"⚖️ New Case Registered: {req.case_title} | LawyerLink"
        msg["From"]    = f"LawyerLink <{EMAIL_SENDER}>"
        msg["To"]      = req.client_email

        msg.attach(MIMEText(build_case_added_email(req), "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.sendmail(EMAIL_SENDER, req.client_email, msg.as_string())

        print(f"✅ Case-added email sent to {req.client_email} for case: {req.case_title}")
        return {"status": "sent", "to": req.client_email}
    except Exception as e:
        print(f"❌ Case-added email failed: {e}")
        return {"status": "failed", "error": str(e)}


# ─────────────────────────────────────────────
# ✦ Consultation Booking Emails
# ─────────────────────────────────────────────
class ConsultationEmailRequest(BaseModel):
    lawyerEmail: str
    lawyerName: str
    booking: dict

class ConsultationReplyRequest(BaseModel):
    litigantEmail: str
    litigantName: str
    lawyerName: str
    replyMessage: str
    originalMessage: str
    preferredDate: str


@app.post("/send-consultation-email/")
def send_consultation_email(req: ConsultationEmailRequest):
    b = req.booking
    html = f"""<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f0f4f8;margin:0;padding:32px 16px;">
<table width="580" align="center" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
<tr><td style="background:linear-gradient(135deg,#1a2744,#243460);padding:28px 32px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:20px;">⚖️ LawyerLink</h1>
<p style="margin:6px 0 0;color:rgba(255,255,255,.6);font-size:12px;text-transform:uppercase;">New Consultation Request</p>
</td></tr>
<tr><td style="padding:28px 32px;">
<p style="color:#1a2744;font-size:15px;font-weight:700;">Dear {req.lawyerName},</p>
<p style="color:#374151;font-size:14px;">You have a new consultation booking request on LawyerLink.</p>
<table width="100%" style="background:#f8faff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:16px 0;border-collapse:collapse;">
<tr><td style="padding:8px;font-size:13px;"><strong>👤 Client:</strong></td><td style="padding:8px;font-size:13px;">{b.get('litigantName','—')}</td></tr>
<tr><td style="padding:8px;font-size:13px;"><strong>📧 Email:</strong></td><td style="padding:8px;font-size:13px;">{b.get('litigantEmail','—')}</td></tr>
<tr><td style="padding:8px;font-size:13px;"><strong>📞 Phone:</strong></td><td style="padding:8px;font-size:13px;">{b.get('litigantPhone','—')}</td></tr>
<tr><td style="padding:8px;font-size:13px;"><strong>⚖️ Case Type:</strong></td><td style="padding:8px;font-size:13px;">{b.get('caseType','—')}</td></tr>
<tr><td style="padding:8px;font-size:13px;"><strong>📅 Date:</strong></td><td style="padding:8px;font-size:13px;color:#c9a84c;font-weight:700;">{b.get('preferredDate','—')} {b.get('preferredTime','')}</td></tr>
<tr><td style="padding:8px;font-size:13px;"><strong>📝 Message:</strong></td><td style="padding:8px;font-size:13px;">{b.get('message','—')}</td></tr>
</table>
<div style="text-align:center;margin:20px 0;">
<a href="https://lawyer-link-frontend.vercel.app/lawyer" style="background:linear-gradient(135deg,#c9a84c,#e8c96d);color:#1a2744;text-decoration:none;border-radius:50px;padding:12px 28px;font-weight:800;font-size:14px;">View My Consultations →</a>
</div>
</td></tr>
<tr><td style="background:#f8faff;padding:16px;text-align:center;"><p style="color:#9ca3af;font-size:11px;margin:0;">© {date.today().year} LawyerLink</p></td></tr>
</table></body></html>"""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"📅 New Consultation Request from {b.get('litigantName','Client')} | LawyerLink"
        msg["From"]    = f"LawyerLink <{EMAIL_SENDER}>"
        msg["To"]      = req.lawyerEmail
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.sendmail(EMAIL_SENDER, req.lawyerEmail, msg.as_string())
        return {"status": "sent"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


@app.post("/send-consultation-reply/")
def send_consultation_reply(req: ConsultationReplyRequest):
    html = f"""<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f0f4f8;margin:0;padding:32px 16px;">
<table width="580" align="center" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
<tr><td style="background:linear-gradient(135deg,#1a2744,#243460);padding:28px 32px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:20px;">⚖️ LawyerLink</h1>
<p style="margin:6px 0 0;color:rgba(255,255,255,.6);font-size:12px;text-transform:uppercase;">Consultation Response</p>
</td></tr>
<tr><td style="padding:28px 32px;">
<p style="color:#1a2744;font-size:15px;font-weight:700;">Dear {req.litigantName},</p>
<p style="color:#374151;font-size:14px;"><strong>Adv. {req.lawyerName}</strong> has responded to your consultation request.</p>
<div style="background:linear-gradient(135deg,#fef9ee,#fef3c7);border:2px solid #c9a84c;border-radius:12px;padding:20px;margin:16px 0;">
<p style="color:#92400e;font-size:11px;font-weight:700;text-transform:uppercase;margin:0 0 8px;">💬 Lawyer's Response</p>
<p style="color:#1a2744;font-size:14px;line-height:1.7;margin:0;">{req.replyMessage}</p>
</div>
<div style="background:#f8faff;border:1px solid #e5e7eb;border-radius:12px;padding:14px 18px;margin:12px 0;">
<p style="color:#9ca3af;font-size:11px;margin:0 0 4px;">Your original message:</p>
<p style="color:#6b7280;font-size:13px;font-style:italic;margin:0;">{req.originalMessage}</p>
<p style="color:#6b7280;font-size:12px;margin:8px 0 0;">Preferred Date: <strong>{req.preferredDate}</strong></p>
</div>
<div style="text-align:center;margin:20px 0;">
<a href="https://lawyer-link-frontend.vercel.app/litigant" style="background:linear-gradient(135deg,#1a2744,#243460);color:#fff;text-decoration:none;border-radius:50px;padding:12px 28px;font-weight:800;font-size:14px;">View on LawyerLink →</a>
</div>
</td></tr>
<tr><td style="background:#f8faff;padding:16px;text-align:center;"><p style="color:#9ca3af;font-size:11px;margin:0;">© {date.today().year} LawyerLink</p></td></tr>
</table></body></html>"""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"💬 Response from Adv. {req.lawyerName} | LawyerLink"
        msg["From"]    = f"LawyerLink <{EMAIL_SENDER}>"
        msg["To"]      = req.litigantEmail
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.sendmail(EMAIL_SENDER, req.litigantEmail, msg.as_string())
        return {"status": "sent"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}

# ─────────────────────────────────────────────
# ✦ OTP Email Notification
# ─────────────────────────────────────────────
import random

class OTPEmailRequest(BaseModel):
    email: str

def build_otp_email_html(otp: str) -> str:
    """Build a premium HTML email template for OTP."""
    return f"""
    <html>
    <head><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');</style></head>
    <body style="margin:0;padding:0;background:#f0f4ff;font-family:'Inter',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:40px 20px;">
        <tr><td align="center">
          <table width="100%" max-width="500" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 32px rgba(26,39,68,0.08);">
            <tr><td style="background:linear-gradient(135deg,#1a2744,#243460);padding:30px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;letter-spacing:1px;">Lawyer<span style="color:#c9a84c;">Link</span></h1>
            </td></tr>
            <tr><td style="padding:40px 30px;">
              <h2 style="color:#1a2744;font-size:20px;font-weight:800;margin:0 0 16px;">Verify your identity</h2>
              <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
                You are registering as an Advocate on LawyerLink. Use the following One-Time Password to complete your verification.
              </p>
              <div style="background:#f8faff;border:2px dashed #c9a84c;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                <span style="font-family:monospace;font-size:32px;font-weight:800;color:#1a2744;letter-spacing:8px;">{otp}</span>
              </div>
              <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:0;">
                If you did not request this OTP, please ignore this email. This OTP is valid for 10 minutes.
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """

@app.post("/send-otp-email/")
def send_otp_email(req: OTPEmailRequest):
    """Generate OTP and send verification email synchronously."""
    otp = str(random.randint(100000, 999999))
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"{otp} is your LawyerLink Verification OTP"
        msg["From"]    = f"LawyerLink <{EMAIL_SENDER}>"
        msg["To"]      = req.email
        msg.attach(MIMEText(build_otp_email_html(otp), "html"))
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls()
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.sendmail(EMAIL_SENDER, req.email, msg.as_string())
        print(f"✅ OTP email sent to {req.email}")
        return {"status": "sent", "otp": otp}
    except Exception as e:
        print(f"❌ OTP email failed: {e}")
        return {"status": "failed", "error": str(e)}

