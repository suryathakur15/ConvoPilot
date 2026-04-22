from flask import Flask, jsonify
from flask_cors import CORS
from src.config import config
from src.routes import ai_bp


def create_app():
    app = Flask(__name__)
    CORS(app)

    app.register_blueprint(ai_bp)

    @app.route("/health")
    def health():
        return jsonify({
            "status": "ok",
            "provider": config.AI_PROVIDER,
            "service": "convopilot-ai"
        })

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "error": {"message": "Not found"}}), 404

    @app.errorhandler(500)
    def internal(e):
        return jsonify({"success": False, "error": {"message": "Internal error"}}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host=config.HOST, port=config.PORT, debug=config.DEBUG)
