from fastapi import APIRouter
from app.schemas.evaluation import EvaluationRequest, EvaluationResponse
from app.services.evaluation_service import evaluate_summary_service

router = APIRouter()

@router.post("/", response_model=EvaluationResponse)
async def evaluate_summary(request: EvaluationRequest):
    result = evaluate_summary_service(request.original_text, request.generated_summary)
    return result
