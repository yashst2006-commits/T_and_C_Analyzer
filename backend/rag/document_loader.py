from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document


class PDFDocumentLoader:
    """Load PDF files into LangChain document objects."""

    def load(self, pdf_path: str | Path) -> list[Document]:
        path = Path(pdf_path)
        if not path.exists():
            raise FileNotFoundError(f"PDF file not found: {path}")

        loader = PyPDFLoader(str(path))
        return loader.load()
