from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


class TermsTextSplitter:
    """Split documents into retrieval-friendly chunks."""

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50) -> None:
        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )

    def split_documents(self, documents: list[Document]) -> list[Document]:
        return self._splitter.split_documents(documents)
