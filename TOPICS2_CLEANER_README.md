# ✅ Firestore topics2 Cleaner & Unifier

## Overview

Automated script to inspect and clean the Firestore `topics2` collection, ensuring:
- No duplicate categories
- No duplicate topics
- Correct schema `{ id, topic, category, lang }`
- Radiology category removed entirely
- Unified, consistent structure across ALL documents

## Usage

### Automatic (via Cursor)
Type: **"clean topics2"**

Cursor will automatically run the cleanup script.

### Manual
```bash
node scripts/clean_topics2.mjs
```

## What It Does

### 1. Connects to Firestore
- Reads ALL documents from `topics2` collection
- Processes each document individually

### 2. Validates Structure
Each document must have:
- `id`: snake_case string
- `topic`: string (Title Case)
- `category`: string (from standard list)
- `lang`: "en"

**Fixes:**
- Missing fields → Generated from available data
- Wrong format → Normalized
- Extra fields → Removed

### 3. Detects Duplicates
- **Duplicate `id` values** → Regenerate snake_case IDs
- **Duplicate `topic` names** (same category) → Keep one canonical version
- **Duplicate `category` values** → Already normalized to standard list

### 4. Removes Unwanted Categories
- **Deletes ALL documents** with `category == "Radiology"`
- Removes variations: "radiology", "Radiology & Imaging", "imaging", etc.

### 5. Normalizes Categories
- Maps to MedPlat standard categories
- Handles common variations:
  - "ob/gyn" → "Obstetrics & Gynecology"
  - "ent" → "ENT / Otolaryngology"
  - "emergency" → "Emergency Medicine"
  - etc.

### 6. Normalizes IDs
- Always snake_case
- Example: "Acute Abdominal Pain" → "acute_abdominal_pain"
- Ensures `id` matches snake_case of `topic`

### 7. Validates Consistency
- No empty fields
- No mismatched category/topic pairs
- Removes documents with "Case #…" or generic placeholders
- Removes test/dummy topics

### 8. Generates Report
After cleanup, produces:
- Total documents processed
- Documents fixed
- Duplicates removed
- Radiology documents removed
- Invalid documents removed
- Categories normalized
- IDs normalized
- Structural repairs
- Final category list

## Standard Categories

The script uses this standard MedPlat category list (Radiology excluded):

1. Acute Medicine
2. Addiction Medicine
3. Anesthesiology
4. Cardiology
5. Dermatology
6. Disaster & Crisis Response
7. Education
8. Emergency Medicine
9. Endocrinology
10. ENT / Otolaryngology
11. Gastroenterology
12. General Practice
13. Hematology
14. Infectious Diseases
15. Nephrology
16. Neurology
17. Nutrition & Metabolism
18. Obstetrics
19. Obstetrics & Gynecology
20. Occupational Medicine
21. Oncology
22. Ophthalmology
23. Orthopedics
24. Palliative Medicine
25. Pediatrics
26. Psychiatry
27. Public Health
28. Pulmonology
29. Rehabilitation Medicine
30. Rheumatology
31. Telemedicine
32. Toxicology
33. Urology

## Example Output

```
🔍 Starting topics2 collection cleanup...

📖 Reading all documents from topics2...
   Found 1250 documents

🔧 Processing documents...

📊 Processing complete:
   Documents to delete: 45
   Documents to update: 320
   Documents to keep: 885

🗑️  Deleting invalid/duplicate documents...
   ✅ Deleted 45 documents

✏️  Updating documents...
   ✅ Updated 320 documents

============================================================
📋 CLEANUP REPORT
============================================================
Total documents processed: 1250
Documents fixed: 320
Duplicates removed: 25
Radiology documents removed: 15
Invalid documents removed: 5
Categories normalized: 180
IDs normalized: 120
Structural repairs: 320
Documents kept unchanged: 885

Final category count: 33
Categories: Acute Medicine, Addiction Medicine, Anesthesiology, ...
============================================================

✅ Cleanup complete!
```

## Safety

- **Batch operations**: Uses Firestore batches (500 docs per batch)
- **Dry-run option**: Can be modified to preview changes before applying
- **Backup recommended**: Consider backing up collection before running

## Requirements

- Node.js environment
- Firebase credentials configured
- Access to Firestore `topics2` collection
- Proper GCP project permissions

## Notes

- The script processes documents in batches to avoid memory issues
- ID conflicts are resolved by appending timestamp
- Category normalization is case-insensitive
- All changes are written back to Firestore immediately

---

**Ready to clean! Type "clean topics2" in Cursor to run automatically.** 🎯

