import google.generativeai as genai
from .base import BaseProvider
from src.config import config


class GeminiProvider(BaseProvider):
    def __init__(self):
        genai.configure(api_key=config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(
            model_name=config.GEMINI_MODEL,
            system_instruction="You are an expert customer support agent.",
        )

    def complete(self, system: str, user: str, max_tokens: int) -> str:
        prompt = f"{system}\n\n{user}"
        response = self.model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(max_output_tokens=max_tokens),
        )
        # response.text raises ValueError when the candidate is blocked by safety
        # filters or the response has no text part. Surface a clean error instead.
        try:
            return response.text.strip()
        except ValueError as exc:
            # Attempt to extract text from the first candidate directly
            try:
                return response.candidates[0].content.parts[0].text.strip()
            except Exception:
                raise ValueError(f"Gemini returned no usable text: {exc}") from exc
