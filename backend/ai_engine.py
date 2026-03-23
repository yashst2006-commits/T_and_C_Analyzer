import os
import re
from functools import lru_cache
from typing import Any

# Default to local-only model loading so the API does not hang on startup or
# first request in restricted environments. Set MODEL_LOCAL_ONLY=0 to allow
# on-demand downloads from Hugging Face.
MODEL_LOCAL_ONLY = os.getenv("MODEL_LOCAL_ONLY", "1").lower() in {"1", "true", "yes"}

if MODEL_LOCAL_ONLY:
    os.environ.setdefault("HF_HUB_OFFLINE", "1")
    os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
os.environ.setdefault("TRANSFORMERS_NO_ADVISORY_WARNINGS", "1")

import nltk
from nltk.tokenize import sent_tokenize
from transformers import pipeline
from transformers.utils import logging as transformers_logging

transformers_logging.set_verbosity_error()
transformers_logging.disable_progress_bar()


SUMMARY_MODEL_NAME = "facebook/bart-large-cnn"
LEGAL_MODEL_NAME = "nlpaueb/legal-bert-base-uncased"


RISK_KEYWORDS = {
    "Data Collection": ["collect", "device data", "location", "personal information"],
    "Data Sharing": ["share", "third-party", "third party", "partners", "marketing purposes"],
    "No Liability": ["not liable", "not be liable", "no responsibility", "no liability"],
    "Account Termination": ["terminate", "terminated", "suspend account", "without notice"],
    "Arbitration Clause": ["arbitration", "binding arbitration"],
}


RISK_PENALTY = {
    "Data Collection": 5,
    "Data Sharing": 20,
    "No Liability": 25,
    "Account Termination": 10,
    "Arbitration Clause": 15,
}


@lru_cache(maxsize=1)
def ensure_nltk_resources() -> None:
    try:
        nltk.data.find("tokenizers/punkt")
    except LookupError:
        nltk.download("punkt", quiet=True)

    try:
        nltk.data.find("tokenizers/punkt_tab")
    except LookupError:
        nltk.download("punkt_tab", quiet=True)


def extract_clauses(text: str) -> list[str]:
    ensure_nltk_resources()

    normalized_text = text.strip()
    if not normalized_text:
        return []

    try:
        clauses = sent_tokenize(normalized_text)
    except LookupError:
        clauses = re.split(r"(?<=[.!?])\s+", normalized_text)

    return [clause.strip() for clause in clauses if clause.strip()]


@lru_cache(maxsize=1)
def load_summarizer():
    try:
        return pipeline(
            "summarization",
            model=SUMMARY_MODEL_NAME,
            local_files_only=MODEL_LOCAL_ONLY,
            model_kwargs={"use_safetensors": False},
        )
    except Exception:
        return None


@lru_cache(maxsize=1)
def load_classifier():
    try:
        return pipeline(
            "text-classification",
            model=LEGAL_MODEL_NAME,
            local_files_only=MODEL_LOCAL_ONLY,
            model_kwargs={"use_safetensors": False},
        )
    except Exception:
        return None


def detect_risk(clause: str) -> str:
    clause_lower = clause.lower()

    for risk, keywords in RISK_KEYWORDS.items():
        if any(keyword in clause_lower for keyword in keywords):
            return risk

    return "Low Risk"


def analyze_clause_with_model(clause: str) -> dict[str, Any]:
    classifier = load_classifier()
    if classifier is None:
        return {"label": None, "score": None}

    try:
        result = classifier(clause)[0]
        return {
            "label": result.get("label"),
            "score": round(float(result.get("score", 0.0)), 4),
        }
    except Exception:
        return {"label": None, "score": None}


def summarize_policy(text: str, clauses: list[str]) -> str:
    summarizer = load_summarizer()
    if summarizer is not None:
        try:
            result = summarizer(
                text,
                max_length=80,
                min_length=30,
                do_sample=False,
                truncation=True,
            )
            summary = result[0].get("summary_text")
            if summary:
                return summary.strip()
        except Exception:
            pass

    if not clauses:
        return "No clauses were detected."

    if len(clauses) == 1:
        return clauses[0]

    return " ".join(clauses[:2])


def calculate_fairness_score(risks: list[str]) -> int:
    score = 100

    for risk in risks:
        score -= RISK_PENALTY.get(risk, 0)

    return max(score, 0)


def analyze_policy(text: str) -> dict[str, Any]:
    if not text or not text.strip():
        raise ValueError("Policy text must not be empty.")

    clauses = extract_clauses(text)
    clause_analysis = []
    detected_risks = []

    for clause in clauses:
        risk = detect_risk(clause)
        model_analysis = analyze_clause_with_model(clause)

        clause_analysis.append(
            {
                "text": clause,
                "risk": risk,
                "model_label": model_analysis["label"],
                "model_score": model_analysis["score"],
            }
        )

        if risk != "Low Risk":
            detected_risks.append(risk)

    summary = summarize_policy(text, clauses)
    unique_risks = list(dict.fromkeys(detected_risks))

    return {
        "clauses": clause_analysis,
        "risks": unique_risks,
        "score": calculate_fairness_score(detected_risks),
        "summary": summary,
    }
