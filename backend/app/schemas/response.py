from pydantic import BaseModel

class SimplificationResponse(BaseModel):
    simplified_text: str

class ChatResponse(BaseModel):
    answer: str
