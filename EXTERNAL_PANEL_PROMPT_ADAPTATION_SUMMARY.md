# External Panel Prompt Adaptation Summary

**Date:** 2025-01-27  
**Purpose:** Adapt External Panel case review feedback into case generation prompt improvements

---

## ✅ Understanding

The External Panel reviews generated cases **manually** to identify universal issues. Their feedback should be **adapted into prompt instructions** that guide the LLM to generate better cases from the start.

**This is prompt engineering, NOT code implementation.**

---

## 📋 What Was Created

### 1. `PROMPT_IMPROVEMENTS_FROM_EXTERNAL_PANEL.md`
   - 12 prompt instructions converted from External Panel feedback
   - Each with:
     - External Panel Finding (what they saw)
     - Prompt Instruction (how to tell LLM to avoid it)
     - Exact format and examples

### 2. Integration Guidance
   - Where to add in `generate_case_clinical.mjs` (main case generation prompt)
   - Where to add in `internal_panel.mjs` (panel review prompt)
   - Quality failure conditions

---

## 🎯 The 12 Prompt Improvements

1. **Schema & Object Serialization** - Never output [object Object]
2. **Hide Empty Sections** - No placeholders like "No items available"
3. **Differential Diagnosis Structure** - Mandatory FOR/AGAINST format
4. **Reasoning Chain Quality** - Domain-specific, no duplication
5. **Domain-Specific High-Acuity Headers** - Match domain + topic
6. **Structured Treatment Thresholds** - Specific criteria, not vague
7. **Domain-Specific Complications** - Only relevant complications
8. **Structured Pharmacology** - With synergy, not generic
9. **Domain-Tagged Guidelines** - Match case domain
10. **Structured LMIC Alternatives** - Case-specific workflows
11. **Linked Teaching Blocks** - Link to case elements
12. **Reduce Redundancy** - Avoid repeating information

---

## 📍 Next Steps

1. ✅ Review `PROMPT_IMPROVEMENTS_FROM_EXTERNAL_PANEL.md`
2. ⏳ Integrate prompt instructions into:
   - `backend/generate_case_clinical.mjs` (systemPrompt)
   - `backend/intelligence_core/internal_panel.mjs` (panelPrompt)
3. ⏳ Test with new case generation
4. ⏳ Validate improvements address External Panel findings

---

**Status:** ✅ **PROMPT IMPROVEMENTS DOCUMENTED - READY FOR INTEGRATION INTO PROMPTS**

The External Panel's feedback has been converted into actionable prompt instructions that will guide the LLM to generate better cases.

