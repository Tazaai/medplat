// Education-Level Adaptive System
// Adjusts complexity based on user level

/**
 * Adapt educational content based on user level
 * @param {string} userLevel - Student, Resident, Specialist, Expert
 * @returns {Object} Adaptation parameters
 */
export function adaptEducationalLevel(userLevel = "Resident") {
  const adaptations = {
    explanation_complexity: "intermediate",
    algorithm_depth: "standard",
    reasoning_detail: "moderate",
    pathophysiology_depth: "moderate",
    exam_focus: false,
    clinical_focus: true
  };
  
  switch (userLevel.toLowerCase()) {
    case "student":
      adaptations.explanation_complexity = "basic";
      adaptations.algorithm_depth = "simplified";
      adaptations.reasoning_detail = "high";
      adaptations.pathophysiology_depth = "basic";
      adaptations.exam_focus = true;
      adaptations.clinical_focus = false;
      adaptations.notes = "Explain fundamental concepts clearly. Focus on exam-relevant facts. Use simpler language.";
      break;
      
    case "resident":
      adaptations.explanation_complexity = "intermediate";
      adaptations.algorithm_depth = "standard";
      adaptations.reasoning_detail = "moderate";
      adaptations.pathophysiology_depth = "moderate";
      adaptations.exam_focus = true;
      adaptations.clinical_focus = true;
      adaptations.notes = "Balance exam preparation with clinical reasoning. Include guideline-based management.";
      break;
      
    case "specialist":
      adaptations.explanation_complexity = "advanced";
      adaptations.algorithm_depth = "detailed";
      adaptations.reasoning_detail = "moderate";
      adaptations.pathophysiology_depth = "advanced";
      adaptations.exam_focus = false;
      adaptations.clinical_focus = true;
      adaptations.notes = "Focus on nuanced clinical decision-making, guideline interpretation, complex cases.";
      break;
      
    case "expert":
      adaptations.explanation_complexity = "expert";
      adaptations.algorithm_depth = "comprehensive";
      adaptations.reasoning_detail = "concise";
      adaptations.pathophysiology_depth = "expert";
      adaptations.exam_focus = false;
      adaptations.clinical_focus = true;
      adaptations.notes = "Emphasize cutting-edge evidence, guideline controversies, research implications.";
      break;
      
    default:
      // Default to resident level
      break;
  }
  
  return adaptations;
}

/**
 * Apply educational adaptations to case content
 * @param {Object} caseData - Generated case data
 * @param {Object} adaptations - Adaptation parameters
 * @returns {Object} Adapted case data
 */
export function applyEducationalAdaptations(caseData, adaptations) {
  // Note: This would be applied in the prompt generation phase
  // For now, return adaptation instructions
  return {
    adaptation_instructions: `
Educational Level: ${adaptations.explanation_complexity}
- Explanation complexity: ${adaptations.explanation_complexity}
- Algorithm depth: ${adaptations.algorithm_depth}
- Reasoning detail: ${adaptations.reasoning_detail}
- Pathophysiology depth: ${adaptations.pathophysiology_depth}
- Exam focus: ${adaptations.exam_focus ? "Yes - emphasize exam pearls" : "No - focus on clinical practice"}
- Clinical focus: ${adaptations.clinical_focus ? "Yes - emphasize practical management" : "No"}
${adaptations.notes ? `\nNotes: ${adaptations.notes}` : ""}
`
  };
}

