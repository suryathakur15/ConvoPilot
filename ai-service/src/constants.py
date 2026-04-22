SYSTEM_PROMPT_SUPPORT = (
    "You are an expert customer support agent. "
    "Respond concisely, professionally, and empathetically. "
    "Keep replies under 150 words unless detail is necessary."
)

TAGS = ["billing", "bug", "feature", "general", "onboarding", "urgent"]

SENTIMENT_VALUES = ["frustrated", "neutral", "happy"]

PROMPTS = {
    "analyze_sentiment": (
        "Analyze the emotional state of the CUSTOMER in this support conversation.\n"
        "Only consider messages where sender_type is 'user'. Ignore agent messages.\n\n"
        "Score the customer's current emotional state on a scale of 0-100 using these bands:\n"
        "  85-100 : very happy    — effusive thanks, highly satisfied, delighted\n"
        "  70-84  : happy         — clearly pleased, positive tone, uses words like 'thanks', 'great', 'happy'\n"
        "  56-69  : content       — mildly positive, polite, no complaints\n"
        "  45-55  : neutral       — matter-of-fact, no strong emotion either way\n"
        "  31-44  : slightly upset — mild frustration, some impatience\n"
        "  16-30  : frustrated    — clearly unhappy, repeated issue, raised voice\n"
        "  0-15   : very frustrated — angry, threatening to leave, aggressive\n\n"
        "For the 'sentiment' field use the closest match: 'frustrated' (score 0-44), 'neutral' (45-55), or 'happy' (56-100).\n\n"
        "Return ONLY valid JSON — no markdown, no explanation:\n"
        "{{\n"
        "  \"sentiment\": \"frustrated\" | \"neutral\" | \"happy\",\n"
        "  \"score\": <integer 0-100>,\n"
        "  \"reason\": \"<one sentence explaining the score>\",\n"
        "  \"coaching\": \"<specific tip for the agent in ≤20 words, or empty string if score >= 45>\"\n"
        "}}\n\n"
        "Conversation:\n{conversation}"
    ),
    "suggest_reply": (
        "Given the following customer support conversation, write a helpful, concise reply "
        "from the support agent's perspective. Be professional and empathetic. Max 150 words.\n\n"
        "Conversation:\n{conversation}"
    ),
    "summarize": (
        "Summarize the following customer support conversation in 3-5 bullet points. "
        "Include: the customer's issue, actions taken, and current status.\n\n"
        "Conversation:\n{conversation}"
    ),
    "improve_tone": (
        "Rewrite the following support reply to be more professional, empathetic, and clear. "
        "Keep the same meaning. Return only the rewritten message, no explanation.\n\n"
        "Draft: {draft}"
    ),
    "auto_tag": (
        "Classify the following customer message into one or more of these tags: "
        f"{', '.join(TAGS)}.\n"
        "Return only a JSON array of tags, e.g. [\"billing\", \"bug\"]. "
        "Message: {message}"
    ),
}
