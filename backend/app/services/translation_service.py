import logging
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

logger = logging.getLogger(__name__)

# Model configuration
MODEL_NAME = "facebook/nllb-200-distilled-600M"

LANGUAGE_CODES = {
    "Hindi": "hin_Deva",
    "Tamil": "tam_Taml",
    "Marathi": "mar_Deva",
    "Telugu": "tel_Telu",
    "Malayalam": "mal_Mlym",
    "Kannada": "kan_Knda"
}

tokenizer = None
model = None

device = "cuda" if torch.cuda.is_available() else "cpu"

def load_translation_model():
    """Load model and tokenizer if not already loaded"""
    global tokenizer, model, device
    if tokenizer is None or model is None:
        logger.info(f"Loading translation model: {MODEL_NAME} onto {device}...")
        try:
            tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
            model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME).to(device)
            logger.info("Translation model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load translation model: {e}")
            raise RuntimeError(f"Translation model initialization failed: {e}")

def translate_text_service(text: str, target_language: str) -> str:
    from fastapi import HTTPException
    
    if target_language not in LANGUAGE_CODES:
        raise HTTPException(
            status_code=400, 
            detail=f"Language '{target_language}' not supported. Supported: {', '.join(LANGUAGE_CODES.keys())}"
        )
        
    target_code = LANGUAGE_CODES[target_language]
    load_translation_model()
    
    try:
        inputs = tokenizer(text, return_tensors="pt").to(device)
        forced_bos_id = tokenizer.convert_tokens_to_ids(target_code)
        translated_tokens = model.generate(
            **inputs, 
            forced_bos_token_id=forced_bos_id, 
            max_length=200
        )
        translation = tokenizer.batch_decode(translated_tokens, skip_special_tokens=True)[0]
        return translation
    except Exception as e:
        logger.error(f"Translation error: {e}")
        raise HTTPException(status_code=500, detail="An error occurred during translation processing")
