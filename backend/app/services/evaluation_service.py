import logging
from transformers import pipeline
import torch
from rouge_score import rouge_scorer

logger = logging.getLogger(__name__)

nli_model = None
scorer = None

def load_evaluation_models():
    """Load NLI model and ROUGE scorer"""
    global nli_model, scorer
    
    if scorer is None:
        logger.info("Initializing ROUGE scorer...")
        scorer = rouge_scorer.RougeScorer(['rougeL'], use_stemmer=True)
        
    if nli_model is None:
        logger.info("Loading Factuality (NLI) model...")
        device = 0 if torch.cuda.is_available() else -1
        try:
            nli_model = pipeline("text-classification", model="roberta-large-mnli", device=device)
            logger.info("Factuality model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load NLI model: {e}")
            raise RuntimeError(f"Factuality model initialization failed: {e}")

def evaluate_summary_service(original_text: str, generated_summary: str) -> dict:
    load_evaluation_models()
    
    try:
        # 1. ROUGE metric
        scores = scorer.score(original_text, generated_summary)
        rouge_l_percent = scores['rougeL'].fmeasure * 100
        
        # 2. Factuality metric via NLI
        # Limit to 512 tokens to prevent model crash from long web pages
        inputs = f"{original_text} </s></s> {generated_summary}"
        
        result = nli_model(inputs, truncation=True, max_length=512)[0]
        
        label = result['label']
        score = result['score']
        
        if label == 'ENTAILMENT':
            fact_score = score * 100
        elif label == 'NEUTRAL':
            fact_score = 50.0  
        else:
            fact_score = (1 - score) * 100 
            
        return {
            "rouge_l_score_percent": round(rouge_l_percent, 1),
            "factuality_score_percent": round(fact_score, 1)
        }
        
    except Exception as e:
        logger.error(f"Evaluation error: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="An error occurred during evaluation processing")
