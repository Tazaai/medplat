// ~/medplat/backend/generate_case_clinical.mjs
import openai from "./routes/openai_client.js";
import { translateText } from "./utils/translate_util.mjs";

export default async function generateCase({ area, topic, language, model = "gpt-4o-mini" }) {
  if (typeof topic === "object" && topic?.topic) {
    topic = topic.topic;
  }
  if (typeof topic !== "string" || !topic.trim()) {
    throw new Error("Invalid topic input");
  }

  const systemPrompt = `
You are a multidisciplinary panel of senior medical doctors and educators.
Only return structured clinical cases in pure JSON.
Never use markdown formatting, backticks, or introductory/explanatory text.
Start your reply directly with the structured case content.
`.trim();

  const userPrompt = `
Topic: "${topic}"
Medical Specialty: ${area}
Language: ${language}

Generate a full structured clinical case, step-by-step, for medical students or junior doctors.

Use this structure and section headers exactly:

I. Patient History  
I.a Presenting Complaint – symptoms, duration, severity  
I.b Past Medical History – chronic illnesses, surgeries  
I.c Medications and Allergies – regular meds, known allergies  

II. Objective Clinical Findings  
II.a Vitals – pulse, BP, temp, sat, RR  
II.b Physical Exam – relevant findings (lung sounds, tenderness)  
II.c Risk Factors – smoking, diabetes, etc.  
II.d Exposures – drugs, environment, travel  
II.e Family Disposition – genetic/familial conditions  

III. Paraclinical Investigations  
- Labs (e.g., CRP, WBC, creatinine, ABG)  
- Imaging (e.g., X-ray, CT)  
- ECG, urinalysis if relevant  

IV. Differential Diagnoses  
- 3–4 plausible differentials, with 1–2 stronger than others  

V. Final Diagnosis  
- Specific, guideline-consistent clinical diagnosis  

VI. Pathophysiology  
- Mechanism of disease, named systems/cytokines/organs involved  

VI.b Etiology  
- Underlying cause: infection, ischemia, genetic, exposure, etc.  

VII. Conclusion and Discussion  
- Summary of clinical logic and treatment principles  
- 1–2 references (e.g. "Ref: UpToDate", "Ref: Sundhedsstyrelsen")
`.trim();

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    let caseText = (completion?.choices?.[0]?.message?.content || "⚠️ No case generated")
      .trim()
      .replace(/^`{1,3}(json)?|`{1,3}$/g, "");

    const reviewPrompt = `You are a senior medical editor. Polish the following clinical case for clarity, realism, and clinical correctness. Maintain all sections and structure:\n\n${caseText}`;

    const reviewCompletion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You are a senior medical editor." },
        { role: "user", content: reviewPrompt }
      ]
    });

    caseText = reviewCompletion?.choices?.[0]?.message?.content?.trim() || caseText;

    if (language.toLowerCase() !== "english") {
      caseText = await translateText(caseText, language);
    }

    const metadataPrompt = `Read the following clinical case and extract:\n- age: number\n- gender: male, female, or unknown\n- keywords: 3 to 5 important clinical terms\n\nReturn as JSON:\n\n${caseText}`;

    const metaCompletion = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: metadataPrompt }]
    });

    let metaRaw = metaCompletion?.choices?.[0]?.message?.content || "{}";
    metaRaw = metaRaw.trim().replace(/^`{1,3}(json)?|`{1,3}$/g, "");

    let metadata = {};
    try {
      metadata = JSON.parse(metaRaw);
    } catch (err) {
      console.warn("⚠️ Failed to parse metadata JSON:", err.message);
    }

    return typeof caseText === "string"
      ? caseText
      : JSON.stringify({ text: caseText, metadata });
  } catch (err) {
    console.error("❌ generateCase error:", err);
    return `⚠️ Error generating case: ${err.message || "Unknown error"}`;
  }
}
