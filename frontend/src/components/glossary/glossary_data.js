// ~/medplat/frontend/src/components/glossary/glossary_data.js
export const GLOSSARY = {
  sensitivity: {
    title: "Sensitivity",
    synonyms: ["sensitivity", "sensitivitet", "TPR", "true positive rate"],
    summary:
      "Proportion of people with the disease who test positive. High sensitivity → few false negatives.",
    formula: "TP / (TP + FN)",
    note: "Useful to rule OUT disease when test is negative (SnNout)."
  },
  specificity: {
    title: "Specificity",
    synonyms: ["specificity", "specificitet", "TNR", "true negative rate"],
    summary:
      "Proportion of people without the disease who test negative. High specificity → few false positives.",
    formula: "TN / (TN + FP)",
    note: "Useful to rule IN disease when test is positive (SpPin)."
  },
  prevalence: {
    title: "Prevalence",
    synonyms: ["prevalence", "prævalens", "prevalens"],
    summary:
      "Proportion of a population with a condition at a given time (existing cases / total population).",
    formula: "Existing cases / Population",
    note: "Affects PPV/NPV; not the same as incidence."
  },
  incidence: {
    title: "Incidence",
    synonyms: ["incidence", "incidens"],
    summary:
      "Number of new cases occurring in a population during a specified period.",
    formula: "New cases / Population at risk / Time",
    note: "Incidence ≠ Prevalence; incidence is about new cases."
  },
  prognosis: {
    title: "Prognosis",
    synonyms: ["prognosis", "prognose", "outcome"],
    summary:
      "Expected clinical course and outcomes, often expressed as risk (%), morbidity, or mortality over time.",
    formula: "—",
    note: "Often stratified by risk scores, stage, or comorbidity."
  },
  "positive predictive value": {
    title: "Positive Predictive Value (PPV)",
    synonyms: ["positive predictive value", "PPV"],
    summary:
      "Probability that disease is present when the test is positive.",
    formula: "TP / (TP + FP)",
    note: "Depends on prevalence (higher prevalence → higher PPV)."
  },
  "negative predictive value": {
    title: "Negative Predictive Value (NPV)",
    synonyms: ["negative predictive value", "NPV"],
    summary:
      "Probability that disease is absent when the test is negative.",
    formula: "TN / (TN + FN)",
    note: "Depends on prevalence (lower prevalence → higher NPV)."
  },
  "likelihood ratio positive": {
    title: "Likelihood Ratio Positive (LR+)",
    synonyms: ["lr+", "likelihood ratio positive", "positive likelihood ratio"],
    summary:
      "How much more likely a positive test is in disease vs no disease.",
    formula: "Sensitivity / (1 − Specificity)",
    note: "LR+ > 10 gives strong evidence to rule in."
  },
  "likelihood ratio negative": {
    title: "Likelihood Ratio Negative (LR−)",
    synonyms: ["lr-", "likelihood ratio negative", "negative likelihood ratio"],
    summary:
      "How much less likely a negative test is in disease vs no disease.",
    formula: "(1 − Sensitivity) / Specificity",
    note: "LR− < 0.1 gives strong evidence to rule out."
  }
};
