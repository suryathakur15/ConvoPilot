from src.config import config
from .openai_provider import OpenAIProvider
from .claude_provider import ClaudeProvider
from .gemini_provider import GeminiProvider


def get_provider():
    providers = {
        "openai": OpenAIProvider,
        "claude": ClaudeProvider,
        "gemini": GeminiProvider,
    }
    cls = providers.get(config.AI_PROVIDER)
    if not cls:
        raise ValueError(f"Unknown AI provider: {config.AI_PROVIDER}")
    return cls()
