from flask import Blueprint, request, jsonify
from src.services.ai_service import ai_service

bp = Blueprint("ai", __name__, url_prefix="/ai")


@bp.route("/config", methods=["GET"])
def get_ai_config():
    from src.config import config
    return jsonify({
        "provider": config.AI_PROVIDER,
        "gemini": {
            "model": config.GEMINI_MODEL,
            "key_present": bool(config.GEMINI_API_KEY)
        },
        "openai": {
            "model": config.OPENAI_MODEL
        }
    })


def _is_quota_error(e: Exception) -> bool:
    msg = str(e).lower()
    return "quota" in msg or "429" in msg or "rate limit" in msg or "exceeded" in msg


def _is_auth_error(e: Exception) -> bool:
    msg = str(e).lower()
    return "api key" in msg or "authentication" in msg or "401" in msg or "403" in msg


def _classify_error(e: Exception):
    """Return (http_status, user_facing_message) for any provider exception."""
    if _is_quota_error(e):
        return 429, "AI quota exceeded. Please check your API plan or wait a moment and retry."
    if _is_auth_error(e):
        return 401, "AI API key is invalid or missing. Check your .env configuration."
    return 500, f"AI provider error: {str(e)[:200]}"


def _err(msg, status=500):
    return jsonify({"success": False, "error": {"message": msg}}), status


@bp.route("/reply", methods=["POST"])
def suggest_reply():
    data = request.get_json(silent=True) or {}
    messages = data.get("messages")
    if not messages or not isinstance(messages, list):
        return _err("messages array is required", 400)
    try:
        return jsonify({"success": True, "data": ai_service.suggest_reply(messages)})
    except Exception as e:
        status, msg = _classify_error(e)
        return _err(msg, status)


@bp.route("/summarize", methods=["POST"])
def summarize():
    data = request.get_json(silent=True) or {}
    messages = data.get("messages")
    if not messages or not isinstance(messages, list):
        return _err("messages array is required", 400)
    try:
        return jsonify({"success": True, "data": ai_service.summarize(messages)})
    except Exception as e:
        status, msg = _classify_error(e)
        return _err(msg, status)


@bp.route("/improve-tone", methods=["POST"])
def improve_tone():
    data = request.get_json(silent=True) or {}
    draft = data.get("draft")
    if not draft:
        return _err("draft is required", 400)
    try:
        return jsonify({"success": True, "data": ai_service.improve_tone(draft, data.get("context", []))})
    except Exception as e:
        status, msg = _classify_error(e)
        return _err(msg, status)


@bp.route("/sentiment", methods=["POST"])
def analyze_sentiment():
    data = request.get_json(silent=True) or {}
    messages = data.get("messages")
    if not messages or not isinstance(messages, list):
        return _err("messages array is required", 400)
    try:
        return jsonify({"success": True, "data": ai_service.analyze_sentiment(messages)})
    except Exception as e:
        status, msg = _classify_error(e)
        return _err(msg, status)


@bp.route("/tag", methods=["POST"])
def auto_tag():
    data = request.get_json(silent=True) or {}
    message = data.get("message")
    if not message:
        return _err("message is required", 400)
    try:
        return jsonify({"success": True, "data": ai_service.auto_tag(message)})
    except Exception as e:
        # auto-tag failures should be silent — fall back to 'general'
        return jsonify({"success": True, "data": {"tags": ["general"]}})
