# ✅ **MEDPLAT MASTER BLUEPRINT (FINAL, CORRECTED)**

### *Version 4 — Universal Dynamic Case Engine*

---

# 1. System Overview

MedPlat is a **universal dynamic clinical case generator**, designed for medical students, residents, clinicians, and exam candidates.

All content is generated in real-time using:

* **Topic / category**

* **User geolocation (guidelines)**

* **Dynamic reasoning**

* **Top-tier clinical logic**

* **Internal expert panel refinement**

* **Multilingual output**

* **Strict universal JSON schema**

No static templates. No hardcoded guidelines. No beginner mode.

---

# 2. Core Principles

### **✔ 100% Dynamic**

All sections (history, exam, labs, imaging text, management, guidelines, pathophysiology) are dynamically created per-topic.

### **✔ Geolocation → Guidelines**

Language does NOT control guidelines.

User in France reading English → gets FR + EU + WHO cascade.

### **✔ Top-level reasoning always**

No "student mode".

Always specialist-level reasoning with exam-level explanation quality.

### **✔ Internal Panel Only**

MedPlat uses ONE panel:

**Internal Dynamic Expert Panel (backend).**

External panel exists only inside ChatGPT for development assistance — not used in backend.

### **✔ No images**

Radiology & ECG are **text-only interpretation**.

No images, no uploads, no classification.

---

# 3. Backend Architecture

```
backend/

  routes/

    dialog_api.mjs

    topics_api.mjs

  intelligence_core/

    generate_case_clinical.mjs

    internal_panel.mjs

  firebaseClient.js

  package.json

```

## 3.1 Case Generation Flow

```
User → /api/dialog → generate_case_clinical() 

 → Internal Expert Panel (8–10 reviewers)

 → refined_case → frontend

```

## 3.2 Internal Expert Panel (backend)

Dynamic composition (8–10 members):

* 1 Professor of Medicine

* 3 Specialty-aligned consultants

* 2 Emergency physicians

* 2 General Practitioners

* 1 Clinical Pharmacist

* 1 Radiologist (text-based)

* 1 LMIC global health expert

### Panel Focus

* Fix logical inconsistencies

* Correct missing differentials

* Correct management errors

* Align to GEO guidelines (local → national → continental → US → WHO)

* Remove hallucinations

* Strengthen reasoning chains

* Improve pharmacology accuracy

* Ensure red flags, risks, sensitivities, contraindications

* Maintain JSON schema

Always improves case globally.

Never simplifies.

---

# 4. Frontend Architecture

### Core Pages

```
/case

/topics

/dialog

```

### Core Components

* CaseView.jsx

* Level2CaseLogic.jsx

* DialogChat.jsx

* CaseList.jsx

* Topic selectors

* Country detector (geolocation)

### Rendering Rules

1. If gamify = ON → use Level2CaseLogic

2. If gamify = OFF → show full case

3. Path + schema always universal

4. Guidelines grouped by:

   * Local (GEO-based)

   * National

   * Continental (EU/Asia/US)

   * WHO

---

# 5. Topics & Specialties

### Stored in Firebase (`topics2`)

**Core medical specialties**

* Cardiology

* Pulmonology

* Endocrinology

* Gastroenterology

* Nephrology

* Neurology

* Hematology

* Oncology

* Infectious Diseases

* Rheumatology

* Emergency Medicine

* Pediatrics

* Obstetrics/Gynecology

* Psychiatry

* General Practice

* Dermatology

* Orthopedics

* Urology

* Surgery (general)

* Geriatrics

**Add-ons (Phase 4):**

* ALS (Advanced Life Support)

* A-gas (Arterial Blood Gas Interpretation)

* Toxicology

### **NOT included**

❌ ECG Academy

❌ Radiology images

❌ Any image-based feature

---

# 6. Subscription Model (FINAL)

### ✔ Based on **number of cases per month**

No professional tiers.

No levels.

No "Student / Doctor / Expert" paywalls.

### Subscription tiers:

* Free trial: X cases

* Basic plan: ~50 cases/mo

* Pro plan: ~100 cases/mo

* Expert plan: ~200 cases/mo

All plans unlock:

* All specialties

* All languages

* All guidelines

* Full reasoning

* Gamification

---

# 7. Gamification Engine (Phase 4)

### Features

* Progress tracking

* Weekly specialty mastery report

* XP per case

* Mastery levels per specialty:

  * Student

  * Resident

  * Specialist

  * Expert

* Weekly Case Challenge

* Random Challenge

* Encouragement Engine:

  * "🔥 Close to next mastery level!"

  * "📚 +1% progress this week"

### Scoring

* 12 MCQs per case

* Explanations shown **after** quiz

* Score categories:

  * Excellent

  * Good

  * Pass

  * Needs Improvement

---

# 8. Phase 4 (Updated) — Expansion

### 8.1 Add to Firebase (topics2)

* ALS

* A-gas

* Toxicology

These behave like normal specialties.

### 8.2 Improve dynamic reasoning

* More stepwise chains

* More guideline cross-checking

* Better LMIC fallback logic

* Specialty-specific exam pearls

* Better pharmacology reasoning

* Region-specific algorithms

### 8.3 Improve expert conference discussion

* 3-doctor panel simulation

* Short paragraphs

* Always relevant to case

### 8.4 Improve guideline rendering

* Auto-prioritize:

  1. Local

  2. National

  3. Continental

  4. US

  5. WHO

---

# 9. Quality Targets

### Case quality targets

* Internal consistency ≥ 95%

* Guideline alignment ≥ 90%

* Zero hallucinations

* Zero missing core sections

* MCQ correctness ≥ 95%

* CEFR C1 professional tone

* Medical accuracy: specialist level

### Performance targets

* Average case generation: 40–70s

* Internal panel < 60s

* Frontend < 1.5s rendering

---

# 10. Roadmap Summary

### Phase 1

Backend + frontend stable

CaseView + dialog + dynamic guidelines

### Phase 2

Gamified MCQ engine

Score logging

Explanation engine

### Phase 3

Universal dynamic generator

Strict JSON schema

Internal expert panel

### **Phase 4 (NOW)**

Add ALS / A-gas / Tox

Global guideline cascade

Better reasoning chains

Improved expert conference

User progress engine

### Phase 5 (Later)

Admin dashboard

User analytics

Institutional subscription

Teacher dashboard

---

# 11. Development Rules (Cursor)

### Always enforce:

* Universal dynamic generation

* Strict JSON schema

* No static templates

* Top-tier reasoning

* GEO-guideline cascade

* Internal panel refinement

* No image-based modules

* No beginner mode

* No language-based region inference

