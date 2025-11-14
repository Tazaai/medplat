# 🌍 **MedPlat External Development Panel — Governance & Review Guide**

> **Document Type:** Operational Governance Guide  
> **Version:** 1.0.0  
> **Phase:** Phase 5 – Global AI Mentor Network  
> **Last Updated:** 2025-11-13  

---

## 📋 **Executive Summary**

The **External Development Panel (EDP)** is MedPlat's global, multidisciplinary review body ensuring that all AI-generated medical education content is:

- ✅ **Clinically accurate** across specialties
- ✅ **Educationally adaptive** for students, USMLE prep, and practicing physicians
- ✅ **Globally scalable** with cultural and linguistic inclusivity
- ✅ **Evidence-based** with dynamic guideline integration (ESC/AHA/NICE/WHO/local)

**Mission:** Combine **Duolingo-style gamification** with **UpToDate-level medical reasoning** to create the world's most engaging and academically rigorous medical learning platform.

---

## 👥 **Panel Composition (17 Members)**

| **Role**                             | **Count** | **Primary Responsibility**                                                    |
| ------------------------------------ | --------- | ----------------------------------------------------------------------------- |
| **Users**                            |           |                                                                               |
| Medical Student                      | 1         | Student perspective, UX clarity, learning curve feedback                      |
| Medical Doctor (General)             | 1         | Clinical applicability, real-world case relevance                             |
| **Clinical Experts**                 |           |                                                                               |
| Specialists (Cardiology, etc.)       | 3         | Cross-specialty accuracy, guideline alignment, reasoning depth                |
| Clinical Pharmacist                  | 1         | Drug safety, dosing, renal/hepatic adjustments, interactions                  |
| General Practitioners (GPs)          | 2         | Primary care perspective, triage logic, community medicine                    |
| Emergency Medicine Specialists       | 2         | Acute care decision-making, rapid differential diagnosis                      |
| **Research & Academia**              |           |                                                                               |
| Field Researcher                     | 1         | Global health context, low-resource settings, inclusivity                     |
| Radiologists                         | 1-2       | Imaging interpretation, diagnostic accuracy validation                        |
| Professor of Medicine                | 1         | Academic rigor, educational theory, curriculum design                         |
| **Technology & Strategy**            |           |                                                                               |
| AI Education / Medical-Coding Expert | 1         | AI architecture, prompt engineering, adaptive learning algorithms             |
| USMLE Expert                         | 1         | Exam preparation logic, NBME-style question formatting, scoring systems       |
| Web Developer                        | 1         | Frontend UX, performance, accessibility, mobile responsiveness                |
| **Market & Competition**             |           |                                                                               |
| Competitor Voice                     | 1         | Benchmarking against Osmosis, Amboss, Lecturio, UpToDate                      |
| Business Consultant                  | 1         | Product strategy, monetization, user retention, growth metrics                |
| Digital Marketing Expert             | 1         | User acquisition, engagement optimization, analytics interpretation, branding |

---

## 🧭 **Core Leadership (High-Weight Decision Makers)**

These 5 roles guide strategic direction and have amplified voting weight in consensus decisions:

1. **USMLE Expert** – Educational standards and exam readiness
2. **Field Researcher** – Global scalability and inclusivity
3. **Professor of Medicine** – Academic integrity and curriculum design
4. **AI-Coding Expert** – Technical architecture and AI reliability
5. **Medical Student** – User experience and learning effectiveness

---

## ⚙️ **Scope & Review Focus Areas**

### 1. **Clinical Logic & Reasoning**
- **Validation:** Diagnostic accuracy, differential diagnosis completeness, management pathways
- **Cross-Specialty Consistency:** Ensure cardiology, pulmonology, neurology, etc. all follow best practices
- **Evidence Quality:** SORT A/B/C grading, Class I/II/III recommendations
- **Example Review:**
  - "Does the AF case include CHA₂DS₂-VASc scoring and stroke risk stratification?"
  - "Are the differentials for acute chest pain comprehensive (ACS, PE, aortic dissection, pneumothorax)?"

### 2. **Guideline Alignment**
- **Dynamic Fetching:** No hardcoded guidelines; all from Firestore or live APIs
- **4-Tier Cascade:** Local → National → Regional (ESC/AHA) → International (WHO)
- **Regional Adaptation:** Medication availability, cost considerations, resource settings
- **Example Review:**
  - "Danish user should see Sundhedsstyrelsen first, then ESC guidelines"
  - "Low-resource setting: Suggest oral rehydration instead of IV fluids when appropriate"

### 3. **Educational Progression**
- **Adaptive Difficulty:** 60% weak areas / 40% new topics (Phase 3 logic)
- **Personalization:** Student vs. USMLE vs. Doctor personas
- **Gamification Loop:** XP → Streaks → Badges → Leaderboard → Certifications
- **Example Review:**
  - "Are daily challenges appropriately calibrated to user skill level?"
  - "Does the 7-day streak mechanic encourage consistent engagement without burnout?"

### 4. **AI Architecture & Reliability**
- **Model Selection:** GPT-4o-mini vs. GPT-4o based on complexity
- **Prompt Engineering:** Structured prompts for consistent reasoning quality
- **Telemetry & Analytics:** Full tracking of latency, token usage, user interactions
- **Example Review:**
  - "Are reasoning chains logged for quality assurance?"
  - "Does the AI mentor adapt to repeated incorrect answers with simpler explanations?"

### 5. **Global Inclusivity**
- **Multi-Language Support:** 30+ languages (Phase 5 target)
- **Cultural Sensitivity:** Local disease prevalence, treatment norms, ethical considerations
- **Resource Settings:** High-resource (MRI, PCI) vs. low-resource (X-ray, basic labs)
- **Example Review:**
  - "Spanish translation: Medical terminology accurate for Spain vs. Latin America?"
  - "Malaria case: Differentiate guidance for endemic vs. non-endemic regions"

### 6. **User Experience (UX)**
- **Clarity:** Simple language for students, professional tone for doctors
- **Interactivity:** Engaging animations, progress bars, immediate feedback
- **Accessibility:** Screen reader support, keyboard navigation, color contrast
- **Mobile Optimization:** Responsive design for on-the-go learning
- **Example Review:**
  - "Is the mentor chat interface intuitive and mobile-friendly?"
  - "Are badges and achievements visually compelling and motivating?"

---

## 💬 **Feedback Categories & Examples**

### **Category 1: Clinical Accuracy**
**Reviewer:** Emergency Medicine Specialist  
**Feedback:** "Add HEART score for chest pain risk stratification. Current case only mentions ECG and troponin."  
**Action:** Update case generation prompt to include HEART score calculation and interpretation.

### **Category 2: Educational Design**
**Reviewer:** Medical Student  
**Feedback:** "The explanation for kidney function is too technical. Need simpler language with visual aids."  
**Action:** Add step-by-step breakdown with diagrams; adjust persona-based language simplification.

### **Category 3: AI Logic**
**Reviewer:** AI-Coding Expert  
**Feedback:** "Mentor sessions don't persist context across questions. User has to re-explain case details."  
**Action:** Implement session memory in Firestore (mentor_sessions collection with message history).

### **Category 4: Global Adaptation**
**Reviewer:** Field Researcher  
**Feedback:** "Antibiotic recommendations assume access to 3rd-gen cephalosporins. Not available everywhere."  
**Action:** Add resource-level tagging; suggest alternatives (e.g., ampicillin + gentamicin for low-resource).

### **Category 5: UX & Engagement**
**Reviewer:** Competitor Voice  
**Feedback:** "Osmosis has better spaced repetition. We need adaptive review intervals."  
**Action:** Implement Leitner system in Curriculum Builder (Phase 5 enhancement).

### **Category 6: Business Strategy**
**Reviewer:** Digital Marketing Expert  
**Feedback:** "7-day retention is only 45%. Add push notifications for streak reminders."  
**Action:** Integrate Firebase Cloud Messaging; send personalized streak alerts.

---

## 🔁 **Review Workflow & Consensus Process**

### **Step 1: Quarterly Review Cycle**
- **Frequency:** Every 3 months (aligned with MedPlat major releases)
- **Scope:** Review 50-100 sample cases, mentor sessions, curriculum paths
- **Format:** Async Slack/Discord + 2-hour Zoom consensus meeting

### **Step 2: Individual Member Review**
Each panel member receives:
- 10-15 randomized cases across specialties
- Access to analytics dashboard (DAU, retention, quiz scores)
- Session logs from AI mentor and curriculum builder
- UX recordings of user interactions

**Deliverable:** Structured feedback form with:
- Clinical accuracy rating (1-10)
- Educational effectiveness (1-10)
- UX clarity (1-10)
- Priority level (High / Medium / Low)
- Specific action items

### **Step 3: Thematic Aggregation**
Review coordinator (AI-Coding Expert or Professor) groups feedback into themes:
- **Clinical:** Guideline gaps, reasoning errors, missing differentials
- **Educational:** Difficulty calibration, persona alignment, gamification balance
- **Technical:** Latency issues, API failures, memory persistence
- **Global:** Translation errors, cultural insensitivity, resource mismatch
- **UX:** Navigation confusion, mobile bugs, accessibility gaps

### **Step 4: Consensus Meeting**
**Agenda:**
1. Present aggregated themes (15 min)
2. Discuss high-priority items (45 min)
3. Vote on action items (30 min)
4. Assign responsibility (Backend / Frontend / Education Core) (15 min)
5. Set deadlines and next review date (15 min)

**Voting System:**
- Core Leadership (5 members): 2 votes each
- Clinical Experts (9 members): 1.5 votes each
- Technology/Strategy (3 members): 1 vote each
- **Consensus Threshold:** 60% majority for approval

### **Step 5: Global Consensus Summary**
**Output Format:**
```markdown
## [Global Consensus Summary] — Q4 2025

### 🎯 Themes Identified
1. **Clinical Reasoning:** Add risk scores (HEART, CURB-65, CHA₂DS₂-VASc) to 90% of cases
2. **Gamification:** Increase streak incentives; add "comeback bonus" for lapsed users
3. **Global Adaptation:** Expand low-resource medication database to 200+ drugs
4. **UX:** Redesign mentor chat with typing indicators and message threading

### 📊 Priority Distribution
- **High Priority (Complete by next release):** 8 items
- **Medium Priority (Complete within 6 months):** 12 items
- **Low Priority (Backlog for future consideration):** 5 items

### 🛠️ Responsibility Assignment
- **Backend Team:** Risk score APIs, medication database expansion
- **Frontend Team:** Mentor chat redesign, streak notification UI
- **Educational Core:** Gamification algorithm tuning, persona language adjustment
- **AI/Prompt Engineering:** Enhance reasoning chain prompts with structured output

### 📅 Next Review
**Date:** February 15, 2026  
**Focus:** AI Mentor Network (Phase 5) evaluation, multi-language launch readiness
```

### **Step 6: Implementation Tracking**
- **Project Management:** GitHub Projects board with panel feedback issues
- **Progress Updates:** Bi-weekly status reports to panel
- **Validation:** Panel members test staged features before production release

---

## 🧠 **Integration with MedPlat Development**

### **Firestore Schema: Panel Feedback**
```javascript
firestore.collection('panel_feedback').doc(feedbackId)
{
  reviewer_id: "prof_cardiology_1",
  reviewer_role: "Specialist - Cardiology",
  timestamp: "2025-11-13T20:00:00Z",
  review_cycle: "Q4_2025",
  feedback_category: "clinical_accuracy",
  case_id: "case_af_denmark_001",
  rating_clinical: 8,
  rating_educational: 9,
  rating_ux: 7,
  priority: "high",
  comments: "Missing CHA₂DS₂-VASc score in initial assessment. Add stroke risk table.",
  suggested_action: "Update case generation prompt with scoring template",
  status: "open" // open | in_progress | resolved | archived
}
```

### **API Endpoint: Panel Submission**
```javascript
POST /api/panel/submit
Authorization: Bearer <panel_member_jwt>

Body:
{
  "review_cycle": "Q4_2025",
  "feedback_category": "educational_design",
  "case_id": "case_pneumonia_us_002",
  "ratings": {
    "clinical": 9,
    "educational": 7,
    "ux": 8
  },
  "priority": "medium",
  "comments": "Explanation too technical for medical students. Simplify language.",
  "suggested_action": "Add persona-based language adjustment in prompt"
}

Response:
{
  "ok": true,
  "feedback_id": "fb_q4_2025_0042",
  "message": "Feedback submitted successfully. Thank you for your contribution!"
}
```

### **API Endpoint: Consensus Report Generation**
```javascript
GET /api/panel/consensus?cycle=Q4_2025
Authorization: Admin only

Response:
{
  "ok": true,
  "review_cycle": "Q4_2025",
  "total_feedback": 156,
  "themes": [
    {
      "category": "clinical_accuracy",
      "count": 42,
      "avg_priority": "high",
      "top_issues": [
        "Missing risk scores (32 mentions)",
        "Incomplete differentials (10 mentions)"
      ]
    },
    {
      "category": "gamification",
      "count": 28,
      "avg_priority": "medium",
      "top_issues": [
        "Streak incentives too weak (15 mentions)",
        "Badge design not compelling (13 mentions)"
      ]
    }
  ],
  "action_items": [
    {
      "id": "action_001",
      "priority": "high",
      "description": "Add risk scores to 90% of cases",
      "responsibility": "backend",
      "deadline": "2025-12-31",
      "status": "open"
    }
  ],
  "consensus_summary_url": "https://firebasestorage/.../Q4_2025_Consensus.pdf"
}
```

### **Automated Report Generation (Cron Job)**
```javascript
// backend/scripts/generate_panel_consensus.mjs
// Runs every 2 weeks or on-demand via admin trigger

async function generateConsensusReport(reviewCycle) {
  const feedbackSnap = await db.collection('panel_feedback')
    .where('review_cycle', '==', reviewCycle)
    .where('status', '!=', 'archived')
    .get();
  
  const themes = {};
  const actionItems = [];
  
  feedbackSnap.forEach(doc => {
    const data = doc.data();
    if (!themes[data.feedback_category]) {
      themes[data.feedback_category] = {
        count: 0,
        priorities: [],
        issues: []
      };
    }
    themes[data.feedback_category].count++;
    themes[data.feedback_category].priorities.push(data.priority);
    themes[data.feedback_category].issues.push(data.comments);
    
    if (data.priority === 'high') {
      actionItems.push({
        description: data.suggested_action,
        case_id: data.case_id,
        reviewer_role: data.reviewer_role
      });
    }
  });
  
  // Generate markdown report
  const report = buildConsensusMarkdown(themes, actionItems);
  
  // Upload to Firestore Storage
  const reportUrl = await uploadReportToStorage(report, reviewCycle);
  
  // Store metadata in Firestore
  await db.collection('panel_consensus').doc(reviewCycle).set({
    review_cycle: reviewCycle,
    generated_at: admin.firestore.FieldValue.serverTimestamp(),
    total_feedback: feedbackSnap.size,
    themes: themes,
    action_items: actionItems,
    report_url: reportUrl,
    status: 'published'
  });
  
  console.log(`✅ Consensus report generated for ${reviewCycle}: ${reportUrl}`);
  return reportUrl;
}
```

---

## 🎯 **Success Metrics for Panel Review**

### **Quarterly KPIs**
| Metric                          | Target       | Measurement                                          |
| ------------------------------- | ------------ | ---------------------------------------------------- |
| Panel Participation Rate        | ≥ 90%        | Members submitting feedback / Total members          |
| Avg Feedback per Member         | ≥ 10 cases   | Total feedback / Active members                      |
| High-Priority Issue Resolution  | ≥ 80%        | Resolved action items / Total high-priority items    |
| User Satisfaction (Post-Update) | ≥ 4.5/5.0    | App Store rating after panel-driven improvements     |
| Clinical Accuracy Score         | ≥ 9.0/10     | Avg clinical rating across all reviewed cases        |
| Educational Effectiveness       | ≥ 8.5/10     | Avg educational rating across all reviewed cases     |
| Time to Resolution (High Prio)  | ≤ 4 weeks    | Days from feedback submission to production deployment |

### **Long-Term Impact Tracking**
- **User Engagement:** DAU, 7-day retention, session duration
- **Learning Outcomes:** Quiz score improvement over time, certification completion rate
- **Global Reach:** Active users per country, translation accuracy ratings
- **Competitive Position:** Feature parity vs. Osmosis/Amboss, user net promoter score (NPS)

---

## 🚀 **Phase 5 Integration Roadmap**

### **Milestone 1: Panel Infrastructure (Weeks 1-2)**
- [x] Create `docs/panels/EXTERNAL_DEVELOPMENT_PANEL_GUIDE.md`
- [ ] Implement `backend/routes/panel_api.mjs` (POST /submit, GET /consensus)
- [ ] Create Firestore schema for `panel_feedback` and `panel_consensus`
- [ ] Build admin UI for panel member management

### **Milestone 2: Feedback Collection (Weeks 3-4)**
- [ ] Develop panel member dashboard (review assignments, submit feedback)
- [ ] Integrate with Slack/Discord for notifications
- [ ] Create sample case review templates

### **Milestone 3: Consensus Automation (Weeks 5-6)**
- [ ] Build automated consensus report generator (cron job)
- [ ] Implement voting and priority weighting system
- [ ] Generate first Q4 2025 consensus report

### **Milestone 4: Action Tracking (Weeks 7-8)**
- [ ] GitHub integration (auto-create issues from high-priority feedback)
- [ ] Progress dashboard for panel members
- [ ] Bi-weekly status reports

---

## 📚 **Reference Documents**

**Related MedPlat Documentation:**
- `docs/EXTERNAL_PANEL_GUIDE_FOR_COPILOT.md` – Copilot context (non-production)
- `.github/copilot-instructions.md` – Autonomous agent rules
- `PHASE4_PLAN.md` – Phase 4 milestones (completed)
- `docs/phase5/PHASE5_PLANNING.md` – Phase 5 technical architecture

**External Resources:**
- [ESC Guidelines](https://www.escardio.org/Guidelines)
- [AHA/ACC Guidelines](https://www.acc.org/guidelines)
- [NICE Guidelines](https://www.nice.org.uk/guidance)
- [WHO Essential Medicines List](https://www.who.int/medicines/publications/essentialmedicines/)

---

## ✅ **Conclusion**

The External Development Panel ensures MedPlat maintains world-class clinical accuracy, educational effectiveness, and global inclusivity. By combining multidisciplinary expertise with structured feedback cycles, we create a learning platform that is:

- **Engaging** like Duolingo (gamification, streaks, badges)
- **Rigorous** like UpToDate (evidence-based, guideline-aligned)
- **Adaptive** like Khan Academy (personalized learning paths)
- **Global** like WHO (culturally sensitive, resource-aware)

**Next Steps:** Implement Panel API, launch Q4 2025 review cycle, integrate consensus reports into development workflow.

---

**Document Prepared By:** GitHub Copilot (Autonomous Agent)  
**For:** MedPlat Phase 5 – Global AI Mentor Network  
**Status:** Ready for Implementation  
**Review Date:** 2025-11-13  

