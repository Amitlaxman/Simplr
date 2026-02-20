from langchain_groq import ChatGroq
from app.core.config import settings

class AIService:
    def __init__(self):
        self.llm = ChatGroq(
            api_key=settings.GROQ_API_KEY,
            model_name="llama-3.3-70b-versatile"
        )

    async def get_response(self, prompt: str):
        # Using Groq to get a response
        return await self.llm.ainvoke(prompt)
