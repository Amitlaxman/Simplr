from fastapi import APIRouter, HTTPException
from app.schemas.request import ChatRequest
from app.schemas.response import ChatResponse
from app.services.ai_service import AIService
from app.services.rag_engine import RAGEngine

router = APIRouter()
@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    print(f"DEBUG: Received chat request. Question: {request.question}")
    try:
        # Lazy load services to prevent startup hangs
        print("DEBUG: Initializing services...")
        ai_service = AIService()
        rag_engine = RAGEngine()
        
        # Ingest context - in a real app, you might want to cache this
        print(f"DEBUG: Ingesting context ({len(request.context_text)} chars)...")
        await rag_engine.ingest_text(request.context_text)
        
        # Search for relevant snippets
        print("DEBUG: Searching vector store...")
        docs = rag_engine.search(request.question)
        context = "\n\n".join([doc.page_content for doc in docs])
        print(f"DEBUG: Found {len(docs)} relevant snippets.")
        
        prompt = f"""You are a helpful assistant. Answer the question based ONLY on the provided context.
If the answer is not in the context, say that you don't know.

Context:
{context}

Question: {request.question}

Answer:"""
        
        print("DEBUG: Calling Groq...")
        response = await ai_service.get_response(prompt)
        print("DEBUG: Groq response received!")
        return ChatResponse(answer=response.content)
    except Exception as e:
        print(f"DEBUG: Error in chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
