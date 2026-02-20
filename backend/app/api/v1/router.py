from fastapi import APIRouter
from app.api.v1.endpoints import simplify, chat, analyze

api_router = APIRouter()
api_router.include_router(simplify.router, prefix="/simplify", tags=["simplify"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(analyze.router, prefix="/analyze", tags=["analyze"])
