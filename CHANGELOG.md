# Changelog

All notable changes to the MedPlat project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2025-11-09 - Professor-V3 Global Conference Engine

### Added
- **Professor-V3 Dynamic Conference Engine**: Global, specialty-based academic debate system replacing generic doctor names
- **Specialty-Based Identity Model**: Context-driven roles (Emergency Physician, Geriatrician, Radiologist, etc.) automatically selected based on case context
- **Cross-Specialty Debate Validation**: Enforces ≥3 discussion rounds, ≥2 disagreements, ≥3 unique specialties per case
- **Regional Guideline Anchoring**: Local → National → Continental → WHO citation hierarchy with regional context injection
- **Quality Metadata Scoring**: Automated `debate_balance` and `consensus_clarity` metrics computed for each generated case
- **Comprehensive Regression Test Suite**: 5 clinical domains (Neurology, Cardiology, Respiratory, Infectious Disease, Emergency Medicine) with automated validation
- **CI/CD Integration**: GitHub Actions workflow (`professor-v3-tests.yml`) validates debate quality on every PR
- **Frontend Visual Indicators**: 
  - Cross-specialty tension badge (≥2 disagreements detected)
  - Disagreement highlighting with ⚡ icon and yellow background
  - Rebuttal accent borders (orange left-border)
  - Role-first display prioritizing specialty over generic names

### Changed
- **Backend Prompt Architecture**: Complete rewrite of panel discussion generation logic (lines 140-188 in `generate_case_clinical.mjs`)
  - Prohibited generic doctor names (Dr. Smith, Dr. Johnson, etc.)
  - Mandatory 3-round discussion structure with explicit disagreement requirements
  - Emotional realism and clinical nuance in debate tone
- **Frontend Panel Display**: Migrated from parallel monologues to authentic back-and-forth debate rendering
  - Replaced `debates` variable with `pointsOfDebate`
  - Replaced `consensus` variable with `panelConsensus`
  - Role-first rendering: `{round.specialty || round.speaker}`
- **Validation Gates**: Backend enforces minimum quality standards before returning cases
  - Insufficient rounds/disagreements/specialties logged with quality score penalties
  - Consensus length validation (≥100 characters for actionable multi-sentence plans)

### Fixed
- Frontend undefined variable errors (`debates` and `consensus` references)
- External Expert Panel Review UI removed from user-facing workflow (manual-only for system improvements)
- Generic name detection and prevention across all generated content

### Documentation
- `docs/PROFESSOR_V3_CONFERENCE_ENGINE.md`: Complete implementation guide with git workflow, acceptance criteria, and code patterns
- `docs/PROFESSOR_V3_DYNAMIC_TRANSFORMATION.md`: Transformation record from generic names to specialty-based system
- `docs/PROFESSOR_V3_DYNAMIC_VERIFICATION.md`: Live test verification (UTI case, Denmark context)

### Testing
- 5-domain regression test suite covering major clinical specialties
- Automated CI validation on PR merge
- npm script: `npm run test:professor-v3`
- Quality gates: Pass rate ≥80%, zero critical failures

### Deployment
- Backend: `professor-v3-dynamic` revision (commit 241ad49)
- Frontend: `professor-v3-dynamic-fix2` revision (commit 072d643)
- Production: Cloud Run serving 100% traffic with validated debate engine
- Quality Score: ~0.95 (live production metrics)

### Breaking Changes
- None (backward compatible with legacy schema)

### Migration Notes
- Existing cases with old schema still render via fallback `renderPanel()` function
- New cases automatically use professor-v3 dynamic engine
- No database migrations required

---

## [2.2.0] - 2025-11-08 - Professional UI & Conference Panel Restoration

### Added
- Netflix-level UX professional case display component
- UpToDate-level medical presentation quality
- Conference panel dynamic display based on context

### Changed
- Improved UI/UX for case generation interface
- Enhanced visual hierarchy and readability

---

## [2.1.0] - 2025-11-07 - Tier Badges and Panel Enhancements

### Added
- Tier badge system for expert panel displays
- Enhanced panel visual components

---

## [2.0.0] - 2025-11-06 - MCQ Clinical Reasoning Transformation

### Changed
- Transformed MCQs from simple recall to clinical reasoning format
- Enhanced pathophysiology depth in case generation

---

*For detailed commit history, see: https://github.com/Tazaai/medplat/commits/main*
