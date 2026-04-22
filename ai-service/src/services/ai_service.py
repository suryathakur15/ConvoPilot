import json
import re
import logging
from src.providers import get_provider
from src.constants import PROMPTS, SYSTEM_PROMPT_SUPPORT, TAGS, SENTIMENT_VALUES
from src.config import config

logger = logging.getLogger(__name__)


class AIService:
    def __init__(self):
        self.provider = get_provider()

    def suggest_reply(self, messages: list) -> dict:
        conversation = self.provider.format_conversation(messages)
        prompt = PROMPTS["suggest_reply"].format(conversation=conversation)
        reply = self.provider.complete(SYSTEM_PROMPT_SUPPORT, prompt, config.MAX_TOKENS)
        return {"suggestion": reply}

    def summarize(self, messages: list) -> dict:
        conversation = self.provider.format_conversation(messages)
        prompt = PROMPTS["summarize"].format(conversation=conversation)
        summary = self.provider.complete(SYSTEM_PROMPT_SUPPORT, prompt, config.MAX_TOKENS)
        return {"summary": summary}

    def improve_tone(self, draft: str, context: list = None) -> dict:
        prompt = PROMPTS["improve_tone"].format(draft=draft)
        improved = self.provider.complete(SYSTEM_PROMPT_SUPPORT, prompt, config.MAX_TOKENS)
        return {"improved": improved}

    def analyze_sentiment(self, messages: list) -> dict:
        """
        Returns sentiment, score (0-100), reason, and an optional coaching tip.
        NEVER raises — falls back to neutral/50 on any error so the message
        flow is never disrupted by a sentiment failure.
        """
        _fallback = {"sentiment": "neutral", "score": 50, "reason": "", "coaching": ""}
        try:
            conversation = self.provider.format_conversation(messages)
            prompt = PROMPTS["analyze_sentiment"].format(conversation=conversation)
            raw = self.provider.complete(
                "You are a sentiment analysis engine. Return only valid JSON.",
                prompt,
                256,
            )

            logger.info("Sentiment raw AI response: %s", raw)

            # 1. Strip markdown code fences (```json … ```) if the model added them
            clean = re.sub(r"```(?:json)?|```", "", raw.strip()).strip()

            # 2. If the model returned bare key-value lines (no outer braces), wrap them
            if not clean.startswith("{"):
                clean = "{" + clean + "}"

            data = json.loads(clean)

            sentiment = data.get("sentiment", "neutral")
            if sentiment not in SENTIMENT_VALUES:
                # Coerce to nearest bucket based on score
                raw_score = int(data.get("score", 50))
                if raw_score <= 44:
                    sentiment = "frustrated"
                elif raw_score <= 55:
                    sentiment = "neutral"
                else:
                    sentiment = "happy"

            score = int(data.get("score", 50))
            score = max(0, min(100, score))

            reason   = str(data.get("reason",   ""))[:300]
            coaching = str(data.get("coaching", ""))[:200]

            # Coaching is only meaningful when frustrated (score < 45)
            if score >= 45:
                coaching = ""

            logger.info("Sentiment parsed: sentiment=%s score=%d reason=%s", sentiment, score, reason)

            return {
                "sentiment": sentiment,
                "score":     score,
                "reason":    reason,
                "coaching":  coaching,
            }
        except Exception as e:
            logger.error("Sentiment analysis failed: %s", str(e), exc_info=True)
            return _fallback

    def auto_tag(self, message: str) -> dict:
        prompt = PROMPTS["auto_tag"].format(message=message)
        raw = self.provider.complete(
            "You are a classifier. Return only valid JSON arrays.",
            prompt,
            64,
        )
        try:
            # Extract JSON array even if there's surrounding text
            match = re.search(r'\[.*?\]', raw, re.DOTALL)
            tags = json.loads(match.group()) if match else []
            tags = [t for t in tags if t in TAGS]
            if not tags:
                tags = ["general"]
        except Exception:
            tags = ["general"]
        return {"tags": tags}


ai_service = AIService()
