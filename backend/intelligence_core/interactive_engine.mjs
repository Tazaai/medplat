// backend/intelligence_core/interactive_engine.mjs
// Hybrid Gamification v2.0: Interactive Simulation Engine
// Refines and structures simulation data from GPT-generated case
// Does NOT generate text - only structures/refines existing data

/**
 * Build simulation steps structure from case data
 * @param {Object} caseData - Generated case data
 * @returns {Array} Array of simulation steps
 */
export function buildSimulation(caseData) {
  const steps = caseData.simulation_steps || [];
  
  // Ensure each step has required structure
  return steps.map((step, index) => ({
    step_id: step.step_id || `step_${index + 1}`,
    description: step.description || "",
    action_type: step.action_type || "observation",
    required_input: step.required_input || null,
    next_steps: step.next_steps || [],
    xp_value: step.xp_value || 10,
    time_elapsed: step.time_elapsed || 0,
    ...step
  }));
}

/**
 * Build branching logic structure
 * @param {Object} caseData - Generated case data
 * @returns {Object} Branching logic map
 */
export function buildBranching(caseData) {
  const branching = caseData.branching_logic || {};
  
  // Ensure branching logic has consistent structure
  const structured = {};
  Object.keys(branching).forEach(branchId => {
    const branch = branching[branchId];
    structured[branchId] = {
      condition: branch.condition || "",
      outcome: branch.outcome || "",
      next_branch: branch.next_branch || null,
      xp_gain: branch.xp_gain || 0,
      feedback: branch.feedback || "",
      ...branch
    };
  });
  
  return structured;
}

/**
 * Build vitals timeline structure
 * @param {Object} caseData - Generated case data
 * @returns {Array} Array of vital sign measurements over time
 */
export function buildVitals(caseData) {
  const vitals = caseData.vitals_timeline || [];
  
  // Ensure each vital entry has required fields
  return vitals.map((vital, index) => ({
    time: vital.time || index * 15, // Default: 15-minute intervals
    bp: vital.bp || "",
    hr: vital.hr || "",
    rr: vital.rr || "",
    temp: vital.temp || "",
    spo2: vital.spo2 || "",
    notes: vital.notes || "",
    ...vital
  }));
}

/**
 * Build interaction points structure
 * @param {Object} caseData - Generated case data
 * @returns {Array} Array of decision points
 */
export function buildInteractionPoints(caseData) {
  const points = caseData.interaction_points || [];
  
  // Ensure each interaction point has required structure
  return points.map((point, index) => ({
    point_id: point.point_id || `interaction_${index + 1}`,
    question: point.question || "",
    options: Array.isArray(point.options) ? point.options : [],
    correct_path: point.correct_path || null,
    feedback: point.feedback || "",
    xp_reward: point.xp_reward || 20,
    difficulty: point.difficulty || "intermediate",
    ...point
  }));
}

/**
 * Validate simulation safety rules
 * @param {Object} caseData - Generated case data
 * @returns {Object} Validation result with errors/warnings
 */
export function validateSimulationSafety(caseData) {
  const errors = [];
  const warnings = [];
  
  // Check vitals progression makes clinical sense
  const vitals = buildVitals(caseData);
  for (let i = 1; i < vitals.length; i++) {
    const prev = vitals[i - 1];
    const curr = vitals[i];
    
    // Check for unrealistic vital sign changes
    if (prev.hr && curr.hr) {
      const hrChange = Math.abs(parseInt(curr.hr) - parseInt(prev.hr));
      if (hrChange > 60) {
        warnings.push(`Unrealistic HR change: ${prev.hr} → ${curr.hr} (step ${i})`);
      }
    }
    
    if (prev.bp && curr.bp) {
      const bpMatch = prev.bp.match(/(\d+)\/(\d+)/);
      const currBpMatch = curr.bp.match(/(\d+)\/(\d+)/);
      if (bpMatch && currBpMatch) {
        const prevSys = parseInt(bpMatch[1]);
        const currSys = parseInt(currBpMatch[1]);
        if (Math.abs(currSys - prevSys) > 50) {
          warnings.push(`Unrealistic BP change: ${prev.bp} → ${curr.bp} (step ${i})`);
        }
      }
    }
  }
  
  // Check branching logic consistency
  const branching = buildBranching(caseData);
  Object.keys(branching).forEach(branchId => {
    const branch = branching[branchId];
    if (branch.next_branch && !branching[branch.next_branch]) {
      errors.push(`Branch ${branchId} references non-existent next_branch: ${branch.next_branch}`);
    }
  });
  
  // Check simulation steps reference valid branches
  const steps = buildSimulation(caseData);
  steps.forEach(step => {
    if (step.next_steps && Array.isArray(step.next_steps)) {
      step.next_steps.forEach(nextStepId => {
        if (!steps.find(s => s.step_id === nextStepId)) {
          warnings.push(`Step ${step.step_id} references non-existent next_step: ${nextStepId}`);
        }
      });
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Refine all interactive elements from case data
 * @param {Object} caseData - Generated case data
 * @returns {Object} Refined case data with structured interactive elements
 */
export function refineInteractiveElements(caseData) {
  return {
    ...caseData,
    simulation_steps: buildSimulation(caseData),
    branching_logic: buildBranching(caseData),
    vitals_timeline: buildVitals(caseData),
    interaction_points: buildInteractionPoints(caseData),
    simulation_safety: validateSimulationSafety(caseData)
  };
}

