from pydantic import BaseModel

class EvaluationRequest(BaseModel):
    original_text: str
    generated_summary: str

class EvaluationResponse(BaseModel):
    rouge_l_score_percent: float
    factuality_score_percent: float
