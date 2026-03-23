from typing import Any

from pathlib import Path

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings


class FAISSVectorStoreManager:
    """Create, load, save, and expose retrievers for FAISS indexes."""

    def __init__(self, index_dir: str | Path) -> None:
        self.index_dir = Path(index_dir)
        self.index_dir.mkdir(parents=True, exist_ok=True)

    def build(self, documents: list[Document], embeddings: Embeddings) -> FAISS:
        if not documents:
            raise ValueError("No document chunks were provided for indexing.")

        return FAISS.from_documents(documents, embeddings)

    def save(self, vector_store: FAISS) -> None:
        vector_store.save_local(str(self.index_dir))

    def load(self, embeddings: Embeddings) -> FAISS | None:
        index_file = self.index_dir / "index.faiss"
        if not index_file.exists():
            return None

        return FAISS.load_local(
            str(self.index_dir),
            embeddings,
            allow_dangerous_deserialization=True,
        )

    def as_retriever(self, vector_store: FAISS, top_k: int = 4) -> Any:
        return vector_store.as_retriever(search_kwargs={"k": top_k})
