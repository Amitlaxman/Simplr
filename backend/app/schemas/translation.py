from pydantic import BaseModel, Field

class TranslationRequest(BaseModel):
    text: str = Field(..., description="The English text to translate")
    target_language: str = Field(..., description="The target language (e.g., Hindi, Tamil, Marathi, Telugu, Malayalam, Kannada)")

class TranslationResponse(BaseModel):
    original_text: str
    translated_text: str
    target_language: str
