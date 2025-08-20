#!/bin/bash
echo "📚 Genererer AI-emner..."

cat <<EOF > topics.jsonl
{"topic": "Forgiftning – opioider", "source": "ai_topic", "tags": ["akutmedicin", "toksikologi"], "level": "kompleks"}
{"topic": "Hjertesvigt med stase og nyresvigt", "source": "ai_topic", "tags": ["akutmedicin", "kardiologi", "nefrologi"], "level": "kompleks"}
{"topic": "Uafklaret brystsmerte – iskæmi eller blødning?", "source": "ai_topic", "tags": ["akutmedicin", "kardiologi"], "level": "middel"}
{"topic": "LP med neurologiske udfald – obs. tumor", "source": "ai_topic", "tags": ["neurologi", "akutmedicin"], "level": "kompleks"}
{"topic": "Multisystemsvigt hos geriatriske patient", "source": "ai_topic", "tags": ["akutmedicin", "geriatrisk", "sepsis"], "level": "kompleks"}
EOF

echo "✅ Emner genereret. Starter upload..."
python3 upload_topics.py
