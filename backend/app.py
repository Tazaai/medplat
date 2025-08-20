# app.py
from flask import Flask, request, jsonify
from openai_utils import generate_case_from_topic
import traceback  # Bruges til fejllogning

app = Flask(__name__)

@app.route("/generate_case", methods=["POST"])
def generate_case():
    try:
        data = request.get_json()
        topic = data.get("topic")
        level = data.get("level", "middel")  # default til "middel" hvis intet angives

        if not topic:
            return jsonify({"error": "Topic is required"}), 400

        case = generate_case_from_topic(topic, level)
        return jsonify({
            "topic": topic,
            "level": level,
            "case": case
        })

    except Exception as e:
        # Fejllogning til konsol
        print("🔥 Fejl i generate_case():", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
