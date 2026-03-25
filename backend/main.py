import os
import logging
import shutil
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from .ai_engine import analyze_policy, ensure_nltk_resources
    from .rag import PipelineNotReadyError, TermsConditionsRAGPipeline
except ImportError:
    from ai_engine import analyze_policy, ensure_nltk_resources
    from rag import PipelineNotReadyError, TermsConditionsRAGPipeline


logger = logging.getLogger(__name__)
RAG_STORAGE_DIR = Path(__file__).resolve().parent / "data" / "rag"


class AnalyzeRequest(BaseModel):
    text: str


class ClauseResult(BaseModel):
    text: str
    risk: str
    model_label: str | None = None
    model_score: float | None = None


class AnalyzeResponse(BaseModel):
    clauses: list[ClauseResult]
    risks: list[str]
    score: int
    summary: str


class UploadResponse(BaseModel):
    document_name: str
    pages: int
    chunks: int
    message: str


class AskRequest(BaseModel):
    question: str


class SourceChunk(BaseModel):
    page: int | None = None
    chunk_index: int | None = None
    text: str


class AskResponse(BaseModel):
    answer: str
    document_name: str | None = None
    sources: list[SourceChunk]


def get_rag_pipeline(app: FastAPI) -> TermsConditionsRAGPipeline:
    rag_pipeline = getattr(app.state, "rag_pipeline", None)
    if rag_pipeline is None:
        rag_pipeline = TermsConditionsRAGPipeline(storage_dir=RAG_STORAGE_DIR)
        app.state.rag_pipeline = rag_pipeline
    return rag_pipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Keep startup lightweight so the API can boot even when optional ML models
    # are not cached locally yet.
    #ensure_nltk_resources()
    #app.state.rag_pipeline = get_rag_pipeline(app)
    yield


app = FastAPI(
    title="Terms & Conditions Analyzer API",
    version="1.0.0",
    lifespan=lifespan,
)

PORT = int(os.environ.get("PORT", 10000))

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "message": "Terms & Conditions Analyzer API",
        "health": "/health",
        "analyze": "/analyze",
        "upload": "/upload",
        "ask": "/ask",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    try:
        result = analyze_policy(request.text)
        return AnalyzeResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Analysis failed.")
        raise HTTPException(status_code=500, detail="Analysis failed.") from exc


@app.post("/upload", response_model=UploadResponse)
async def upload_pdf(request: Request, file: UploadFile = File(...)) -> UploadResponse:
    rag_pipeline = get_rag_pipeline(request.app)

    if not file.filename:
        raise HTTPException(status_code=400, detail="A PDF filename is required.")

    is_pdf = file.content_type == "application/pdf" or file.filename.lower().endswith(".pdf")
    if not is_pdf:
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    destination = rag_pipeline.create_document_path(file.filename)

    try:
        # Persist the uploaded PDF locally because PyPDFLoader works from a filesystem path.
        with destination.open("wb") as output_file:
            shutil.copyfileobj(file.file, output_file)

        # Build chunks, embeddings, and the FAISS index in one reusable pipeline call.
        metadata = rag_pipeline.ingest_pdf(destination)
        return UploadResponse(
            document_name=metadata["document_name"],
            pages=metadata["page_count"],
            chunks=metadata["chunk_count"],
            message="Document uploaded and indexed successfully.",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("RAG document upload failed.")
        raise HTTPException(status_code=500, detail="Document upload failed.") from exc
    finally:
        await file.close()


@app.post("/ask", response_model=AskResponse)
async def ask_question(request: Request, payload: AskRequest) -> AskResponse:
    rag_pipeline = get_rag_pipeline(request.app)

    try:
        response = rag_pipeline.ask(payload.question)
        return AskResponse(**response)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PipelineNotReadyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("RAG question answering failed.")
        raise HTTPException(status_code=500, detail="Question answering failed.") from exc
