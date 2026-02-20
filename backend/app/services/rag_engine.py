from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import settings
import os

class RAGEngine:
    def __init__(self):
        # Load embeddings once
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=100
        )
        # Initialize an in-memory vector store
        self.vector_store = None

    async def ingest_text(self, text: str):
        # For a per-page chat, we refresh the in-memory store
        chunks = self.text_splitter.split_text(text)
        
        # We recreate the vector store in memory for each new page context
        # This is very fast and avoids file lock issues on Windows
        self.vector_store = Chroma.from_texts(
            texts=chunks,
            embedding=self.embeddings,
            collection_name="simplr_session"
        )

    def search(self, query: str, k: int = 3):
        if not self.vector_store:
            return []
        return self.vector_store.similarity_search(query, k=k)
