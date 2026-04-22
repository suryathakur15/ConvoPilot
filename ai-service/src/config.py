import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    HOST = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
    PORT = int(os.getenv("AI_SERVICE_PORT", 8000))
    DEBUG = os.getenv("NODE_ENV", "development") == "development"

    AI_PROVIDER = os.getenv("AI_PROVIDER", "openai")

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL   = os.getenv("OPENAI_MODEL", "gpt-4o")

    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL   = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")

    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    MAX_TOKENS = int(os.getenv("AI_MAX_TOKENS", 512))


config = Config()
