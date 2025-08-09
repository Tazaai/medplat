// ~/medplat/backend/quality/gamify_quality.mjs
// Quality override for Medplat gamification

/**
 * Override the default buildPrompt to enforce 8–12 MCQs
 * and improve reasoning quality.
 */
export function buildPrompt({ paragraphs, language, topic, region }) {
  return [
    {
      role: "system",
      content: `You are a panel of 3 senior ${topic} specialists discussing a case.
The goal is to generate **8–12 high-quality MCQs** that follow a logical, clinical chronology.
Each MCQ should be tagged with a type: pathophysiology, risk, red_flags, basics, diagnosis, management, treatment.
No final diagnosis questions in the first 3 steps.`
    },
    {
      role: "user",
      content: `Case text: ${paragraphs}
Language: ${language}
Region: ${region || "global"}
Topic: ${topic}

Instructions:
1. Create 8–12 clinically realistic MCQs.
2. Each MCQ must have:
   - question: string
   - choices: array of { text, score: 3|1|0, explanation }
   - type: one of pathophysiology|risk|red_flags|basics|diagnosis|management|treatment
3. Ensure plausible distractors and 1 clearly wrong choice.
4. Avoid repetition of question types.
5. Explanations should reflect expert reasoning from a 3-doctor panel.`
    }
  ];
}

/**
 * Optional MCQ post-processor — can enforce limits or filter bad items.
 */
export function postprocessMCQs({ mcqs }) {
  // Keep only first 12, ensure min 8
  let filtered = mcqs.filter(q => q && q.question && Array.isArray(q.choices));
  if (filtered.length > 12) filtered = filtered.slice(0, 12);

  // If GPT returned fewer than 8, we still pass them but can log
  if (filtered.length < 8) {
    console.warn(`[quality] Only ${filtered.length} MCQs generated — below target`);
  }

  return filtered;
}
