import os
from functools import lru_cache

from langchain_huggingface import HuggingFaceEmbeddings


EMBEDDING_MODEL_NAME = os.getenv(
    "RAG_EMBEDDING_MODEL",
    "sentence-transformers/all-MiniLM-L6-v2",
)
EMBEDDING_DEVICE = os.getenv("RAG_EMBEDDING_DEVICE", "cpu")
# Default to local-only model loading so upload/ask fail fast when the runtime
# cannot reach Hugging Face. Set MODEL_LOCAL_ONLY=0 to allow remote downloads.
MODEL_LOCAL_ONLY = os.getenv("MODEL_LOCAL_ONLY", "1").lower() in {"1", "true", "yes"}


@lru_cache(maxsize=1)
def get_embeddings() -> HuggingFaceEmbeddings:
    """Create a single reusable embeddings client for the app process."""

    return HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL_NAME,
        model_kwargs={
            "device": EMBEDDING_DEVICE,
            "local_files_only": MODEL_LOCAL_ONLY,
        },
        encode_kwargs={"normalize_embeddings": True},
    )
