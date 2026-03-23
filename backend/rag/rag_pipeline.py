import json
import os
import re
from functools import lru_cache
from pathlib import Path
from threading import RLock
from typing import Any

from langchain_classic.chains import RetrievalQA
from langchain_core.prompts import PromptTemplate
from langchain_huggingface import HuggingFacePipeline
from transformers import pipeline

from .document_loader import PDFDocumentLoader
from .embeddings import get_embeddings
from .text_splitter import TermsTextSplitter
from .vector_store import FAISSVectorStoreManager


# Default to local-only model loading so the API remains responsive in locked
# down environments. Set MODEL_LOCAL_ONLY=0 to allow remote downloads.
MODEL_LOCAL_ONLY = os.getenv("MODEL_LOCAL_ONLY", "1").lower() in {"1", "true", "yes"}
LLM_MODEL_NAME = os.getenv("RAG_LLM_MODEL", "google/flan-t5-base")


QA_PROMPT = PromptTemplate(
    input_variables=["context", "question"],
    template=(
        "You are answering questions about an uploaded Terms and Conditions document. "
        "Use only the retrieved context.\n"
        "If the answer is not supported by the context, say that the document does not provide enough information.\n\n"
        "Context:\n{context}\n\n"
        "Question: {question}\n"
        "Answer:"
    ),
)


class PipelineNotReadyError(RuntimeError):
    """Raised when a question is asked before a document has been indexed."""


@lru_cache(maxsize=1)
def get_llm() -> HuggingFacePipeline:
    """Create a single reusable text generation pipeline for QA."""

    generator = pipeline(
        "text2text-generation",
        model=LLM_MODEL_NAME,
        tokenizer=LLM_MODEL_NAME,
        max_new_tokens=256,
        do_sample=False,
        local_files_only=MODEL_LOCAL_ONLY,
        model_kwargs={"use_safetensors": False},
    )
    return HuggingFacePipeline(pipeline=generator)


class TermsConditionsRAGPipeline:
    """Shared RAG pipeline for ingesting a PDF once and reusing it across questions."""

    def __init__(self, storage_dir: str | Path, top_k: int = 4) -> None:
        self.storage_dir = Path(storage_dir)
        self.documents_dir = self.storage_dir / "documents"
        self.index_dir = self.storage_dir / "faiss_index"
        self.metadata_path = self.storage_dir / "metadata.json"

        self.documents_dir.mkdir(parents=True, exist_ok=True)
        self.index_dir.mkdir(parents=True, exist_ok=True)

        self.loader = PDFDocumentLoader()
        self.splitter = TermsTextSplitter()
        self.vector_store_manager = FAISSVectorStoreManager(self.index_dir)
        self.top_k = top_k
        self.lock = RLock()

        self._embeddings = None
        self._llm = None
        self.vector_store = None
        self.retriever = None
        self.qa_chain = None
        self.active_document_name: str | None = None

    @property
    def embeddings(self):
        if self._embeddings is None:
            self._embeddings = get_embeddings()
        return self._embeddings

    @property
    def llm(self):
        if self._llm is None:
            self._llm = get_llm()
        return self._llm

    def load_existing_index(self) -> bool:
        """Reload a previously saved FAISS index if one exists."""

        with self.lock:
            vector_store = self.vector_store_manager.load(self.embeddings)
            if vector_store is None:
                return False

            self._set_vector_store(vector_store)

            if self.metadata_path.exists():
                metadata = json.loads(self.metadata_path.read_text(encoding="utf-8"))
                self.active_document_name = metadata.get("document_name")

            return True

    def ingest_pdf(self, pdf_path: str | Path) -> dict[str, Any]:
        """Load, split, embed, and index a PDF for retrieval."""

        path = Path(pdf_path)
        with self.lock:
            # Load page-level PDF content first so downstream features can keep page metadata.
            documents = self.loader.load(path)
            if not documents:
                raise ValueError("The uploaded PDF did not contain any readable pages.")

            # Split pages into smaller chunks that are easier to embed and retrieve accurately.
            chunks = self.splitter.split_documents(documents)
            if not chunks:
                raise ValueError("The uploaded PDF did not produce any indexable chunks.")

            for chunk_index, chunk in enumerate(chunks):
                chunk.metadata["document_name"] = path.name
                chunk.metadata["source_path"] = str(path)
                chunk.metadata["chunk_index"] = chunk_index

            # Rebuild the FAISS index for the latest uploaded document.
            vector_store = self.vector_store_manager.build(chunks, self.embeddings)
            self.vector_store_manager.save(vector_store)
            self._set_vector_store(vector_store)
            self.active_document_name = path.name

            metadata = {
                "document_name": path.name,
                "page_count": len(documents),
                "chunk_count": len(chunks),
            }
            self.metadata_path.write_text(
                json.dumps(metadata, indent=2),
                encoding="utf-8",
            )

            return metadata

    def ask(self, question: str) -> dict[str, Any]:
        """Answer a question using retrieved document chunks as context."""

        normalized_question = question.strip()
        if not normalized_question:
            raise ValueError("Question must not be empty.")

        with self.lock:
            if self.qa_chain is None:
                try:
                    restored = self.load_existing_index()
                except Exception as exc:
                    raise RuntimeError(
                        "A saved document index exists, but the retrieval models could not be loaded."
                    ) from exc

                if not restored:
                    raise PipelineNotReadyError("Upload a PDF before asking questions.")

            # RetrievalQA pulls the nearest chunks from FAISS and sends them to the LLM prompt.
            result = self.qa_chain.invoke({"query": normalized_question})
            answer = result.get("result", "").strip()
            source_documents = result.get("source_documents", [])

            return {
                "answer": answer,
                "document_name": self.active_document_name,
                "sources": self._serialize_sources(source_documents),
            }

    def create_document_path(self, filename: str | None) -> Path:
        """Return a safe local path for an uploaded PDF."""

        safe_name = self._sanitize_filename(filename or "terms_document.pdf")
        return self.documents_dir / safe_name

    def _set_vector_store(self, vector_store: Any) -> None:
        self.vector_store = vector_store
        self.retriever = self.vector_store_manager.as_retriever(vector_store, top_k=self.top_k)
        self.qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=self.retriever,
            return_source_documents=True,
            chain_type_kwargs={
                "prompt": QA_PROMPT,
                "document_variable_name": "context",
            },
        )

    def _serialize_sources(self, source_documents: list[Any]) -> list[dict[str, Any]]:
        serialized_sources: list[dict[str, Any]] = []
        seen_signatures: set[tuple[Any, ...]] = set()

        for document in source_documents:
            page = document.metadata.get("page")
            normalized_page = page + 1 if isinstance(page, int) else None
            excerpt = re.sub(r"\s+", " ", document.page_content).strip()
            excerpt = excerpt[:300]
            signature = (
                normalized_page,
                document.metadata.get("chunk_index"),
                excerpt,
            )

            if signature in seen_signatures:
                continue

            seen_signatures.add(signature)
            serialized_sources.append(
                {
                    "page": normalized_page,
                    "chunk_index": document.metadata.get("chunk_index"),
                    "text": excerpt,
                }
            )

        return serialized_sources

    @staticmethod
    def _sanitize_filename(filename: str) -> str:
        safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", Path(filename).name)
        return safe_name or "terms_document.pdf"
