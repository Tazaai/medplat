import express from 'express';
import { getOpenAIClient } from '../openaiClient.js';

/**
 * Factory function for panel discussion router
 */
export default function panelDiscussionApi() {
  const router = express.Router();

/**
 * POST /api/panel-discussion
 * 
 * Generate a medical conference-style panel discussion for a case.
 * Shows expert arguments FOR and AGAINST each differential diagnosis.
 * 
 * This is OPTIONAL and user-requested (not automatic).
 * Only medical professionals participate (no web developers).
 * 
 * Request body:
 * {
 *   "caseData": {...},  // Full case object
 *   "focus": "differentials" | "management" | "full"  // Discussion focus
 * }
 * 
 * Response:
 * {
 *   "ok": true,
 *   "discussion": {
 *     "differentials": [
 *       {
 *         "diagnosis": "Acute MI",
 *         "arguments_for": [{speaker: "Cardiologist", argument: "..."}],
 *         "arguments_against": [{speaker: "Emergency Medicine", argument: "..."}],
 *         "consensus": "..."
 *       }
 *     ],
 *     "management": {...},
 *     "teaching_points": {...}
 *   }
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { caseData, focus = 'differentials' } = req.body;

    if (!caseData) {
      return res.status(400).json({ ok: false, error: 'caseData is required' });
    }

    const client = getOpenAIClient();

    // Extract relevant case information
    const topic = caseData.meta?.topic || caseData.Topic || 'Unknown';
    const category = caseData.meta?.category || extractCategory(topic);
    const differentials = caseData.Differential_Diagnoses || caseData.differentials || [];
    const finalDx = caseData.Final_Diagnosis?.Diagnosis || caseData.final_diagnosis?.name || '';
    const history = caseData.Patient_History || caseData.history || '';
    const exam = caseData.Objective_Findings || caseData.exam || '';
    const labs = caseData.Paraclinical_Investigations || caseData.paraclinical || '';

    // Generate panel discussion prompt
    const discussionPrompt = `You are moderating a medical case conference with expert clinicians debating differential diagnoses.

**Case Summary:**
Topic: ${topic}
Category: ${category}
Final Diagnosis: ${finalDx}

**Clinical Presentation:**
${JSON.stringify({ history, exam, labs }, null, 2)}

**Differentials Being Discussed:**
${JSON.stringify(differentials, null, 2)}

**Panel Composition** (MEDICAL PROFESSIONALS ONLY):
- Cardiologist (for cardiovascular aspects)
- Neurologist (for neurological aspects)
- Emergency Medicine Specialist (for acute management)
- Internal Medicine Specialist (for general medicine)
- Relevant subspecialist based on category (e.g., Pulmonologist, Gastroenterologist)
- Medical Student (learning perspective, asks clarifying questions)

**Format**: Simulate a real medical conference where experts present ARGUMENTS FOR and AGAINST each differential.

**Discussion Focus**: ${focus === 'full' ? 'Complete case analysis' : focus}

**Output Requirements**:
Return a JSON object with the following structure:

{
  "differentials_discussion": [
    {
      "diagnosis": "Name of differential",
      "status": "ACCEPTED | REJECTED | UNCERTAIN",
      "arguments_for": [
        {
          "speaker": "Cardiologist",
          "specialty": "Cardiology",
          "argument": "Strong clinical reasoning FOR this diagnosis",
          "supporting_evidence": "Specific findings that support this",
          "confidence": "HIGH | MEDIUM | LOW"
        }
      ],
      "arguments_against": [
        {
          "speaker": "Emergency Medicine",
          "specialty": "Emergency Medicine",
          "argument": "Clinical reasoning AGAINST this diagnosis",
          "contradicting_evidence": "Findings that argue against this",
          "alternative_explanation": "What else could explain these findings"
        }
      ],
      "consensus": "Panel's final verdict on this differential with rationale"
    }
  ],
  "key_disagreements": [
    {
      "topic": "Point of disagreement",
      "viewpoint_1": {"speaker": "...", "position": "..."},
      "viewpoint_2": {"speaker": "...", "position": "..."},
      "resolution": "How the panel resolved this or if it remains open"
    }
  ],
  "teaching_insights": {
    "diagnostic_pitfalls": ["Pitfall 1", "Pitfall 2"],
    "clinical_pearls": ["Pearl 1", "Pearl 2"],
    "evidence_gaps": ["Where evidence is limited or controversial"],
    "learning_objectives": ["Key takeaway 1", "Key takeaway 2"]
  },
  "final_consensus": {
    "agreed_diagnosis": "...",
    "confidence_level": "HIGH | MEDIUM | LOW",
    "dissenting_opinions": ["Any minority viewpoints"],
    "recommended_next_steps": ["Further testing", "Management plan", "Follow-up"]
  }
}

**Style**:
- Professional but conversational (like a real case conference)
- Experts may disagree respectfully
- Use clinical reasoning, not just textbook knowledge
- Reference specific findings from the case
- Medical students ask clarifying questions that help learning
- Avoid generic statements — be specific to THIS case

Return ONLY valid JSON. No markdown, no explanations outside the JSON.`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert medical case conference moderator. Generate realistic, educational panel discussions where experts debate differentials using clinical reasoning. Return only valid JSON.'
        },
        {
          role: 'user',
          content: discussionPrompt
        }
      ],
      temperature: 0.8, // Higher creativity for diverse viewpoints
      max_tokens: 2500,
    });

    const responseText = completion?.choices?.[0]?.message?.content || '{}';
    
    // Try to extract JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in panel discussion response');
    }

    const discussion = JSON.parse(jsonMatch[0]);

    return res.json({
      ok: true,
      discussion,
      meta: {
        topic,
        category,
        focus,
        panel_model: 'gpt-4o-mini',
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Panel discussion error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Failed to generate panel discussion'
    });
  }
});

// Helper: extract category from topic
function extractCategory(topic) {
  const t = topic.toLowerCase();
  if (t.includes('heart') || t.includes('cardiac') || t.includes('mi')) return 'Cardiology';
  if (t.includes('stroke') || t.includes('seizure') || t.includes('neuro')) return 'Neurology';
  if (t.includes('lung') || t.includes('asthma') || t.includes('copd')) return 'Pulmonology';
  if (t.includes('gi') || t.includes('abdomen') || t.includes('liver')) return 'Gastroenterology';
  if (t.includes('kidney') || t.includes('renal')) return 'Nephrology';
  if (t.includes('diabetes') || t.includes('thyroid')) return 'Endocrinology';
  if (t.includes('infection') || t.includes('sepsis')) return 'Infectious Disease';
  if (t.includes('trauma') || t.includes('fracture')) return 'Trauma';
  return 'General Medicine';
}

  return router;
}
