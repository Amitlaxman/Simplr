from pydantic import BaseModel

class SimplificationRequest(BaseModel):
    text: str

class ChatRequest(BaseModel):
    question: str
    context_text: str
