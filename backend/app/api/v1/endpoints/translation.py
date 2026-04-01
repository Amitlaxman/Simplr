from fastapi import APIRouter
from app.schemas.translation import TranslationRequest, TranslationResponse
from app.services.translation_service import translate_text_service

router = APIRouter()

@router.post("/", response_model=TranslationResponse)
async def translate(request: TranslationRequest):
    """
    Translate English text into the selected Indian language.
    """
    translated = translate_text_service(request.text, request.target_language)
    
    return TranslationResponse(
        original_text=request.text,
        translated_text=translated,
        target_language=request.target_language
    )
