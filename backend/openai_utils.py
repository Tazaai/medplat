# openai_utils.py
import openai
import os

def generate_case_from_topic(topic, level="middel"):
    openai.api_key = os.getenv("OPENAI_API_KEY")

    if not openai.api_key:
        return "⚠️ OpenAI API-nøgle mangler. Sæt miljøvariablen OPENAI_API_KEY."

    prompt = f"""
Du er læge i akutmodtagelsen. Generér en realistisk patientcase baseret på følgende emne:

🔶 Emne: {topic}
🔶 Niveau: {level}

Inkludér: kort anamnese, objektive fund, paraklinik og overvejelser. Skriv som om det bruges til klinisk læring.
Undgå at nævne patientens navn. Undgå lange forklaringer – hold det kort og præcist.
"""

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",  # evt. skift til "gpt-3.5-turbo" hvis du ikke har adgang
            messages=[{"role": "user", "content": prompt}],
            max_tokens=700,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        return f"⚠️ Fejl ved OpenAI-anmodning: {str(e)}"
