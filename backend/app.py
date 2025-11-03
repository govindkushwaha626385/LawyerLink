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
    allow_origins=["*"],  # update to ["http://localhost:3000"] in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sys.modules["faiss.swigfaiss_avx2"] = faiss


# --- Recommendation model files ---
rec_repo = "govindkushwaha6263/recommodation-model"

sentence_model_path = hf_hub_download(repo_id=rec_repo, filename="sentence_model.pkl")
faiss_index_path = hf_hub_download(repo_id=rec_repo, filename="faiss_index.pkl")
cases_data_path = hf_hub_download(repo_id=rec_repo, filename="cases_data.pkl")

# Load recommendation model
with open(sentence_model_path, "rb") as f:
    rec_model = pickle.load(f)

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
    top_k: int = 5

@app.post("/recommend/")
def recommend_cases(query: RecommendQuery):
    query_embedding = rec_model.encode([query.text], convert_to_numpy=True)
    distances, indices = index.search(query_embedding, query.top_k)

    results = []
    for i, idx in enumerate(indices[0]):
        case_info = {
    "Case_ID": int(df.iloc[idx]["ID"]) if isinstance(df.iloc[idx]["ID"], (np.integer,)) else df.iloc[idx]["ID"],
    "Score": float(1 / (1 + float(distances[0][i]))),
    "Summary": str(df.iloc[idx]["Summary"])[:400] + "...",
    "Judgment": str(df.iloc[idx]["Judgment"])[:400] + "..."
}

        results.append(case_info)
    return {"results": results}

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

