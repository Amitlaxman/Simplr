from fastapi import APIRouter, HTTPException
from app.schemas.request import SimplificationRequest
from app.schemas.response import SimplificationResponse
from app.services.ai_service import AIService

router = APIRouter()

@router.post("/", response_model=SimplificationResponse)
async def simplify_text(request: SimplificationRequest):
    print(f"DEBUG: Received simplify request. Text length: {len(request.text)}")
    try:
        if not request.text:
            raise HTTPException(status_code=400, detail="Text cannot be empty")
            
        print("DEBUG: Initializing AIService...")
        ai_service = AIService()
        
        prompt = f"Simplify the following text for a general audience:\n\n{request.text}"
        print("DEBUG: Calling Groq...")
        simplified_text = await ai_service.get_response(prompt)
        print("DEBUG: Groq response received!")
        
        return SimplificationResponse(simplified_text=simplified_text.content)
    except Exception as e:
        print(f"DEBUG: Error in simplify_text: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
