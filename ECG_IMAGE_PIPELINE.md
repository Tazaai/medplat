# ECG Image Pipeline Documentation (v15.0.0)

## Overview

The ECG Image Pipeline provides curated, open-source electrocardiogram images for educational purposes within MedPlat's ECG Academy. This system automatically integrates relevant ECG visuals with cardiac rhythm cases while maintaining educational accuracy and legal compliance.

## Architecture

### Core Components

```
ECG Image Pipeline Architecture

┌─────────────────────────────────┐
│       Case Engine              │
│  ┌─────────────────────────┐   │
│  │  Cardiac Detection      │   │
│  │  • 20+ keywords         │   │
│  │  • Smart categorization │   │
│  │  • Auto-integration     │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│    ECG Image Pipeline API       │
│  ┌─────────────────────────┐   │
│  │  fetchECGImageUrl()     │   │
│  │  getECGCategories()     │   │
│  │  searchECGDatabase()    │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│      ECG Image Database         │
│  ┌─────────────────────────┐   │
│  │  6 Curated ECG Images   │   │
│  │  • Normal Rhythm        │   │
│  │  • Atrial Fibrillation  │   │
│  │  • Anterior STEMI       │   │
│  │  │  Ventricular Tach    │   │
│  │  • Complete Heart Block │   │
│  │  • Left Bundle Branch   │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

## Database Structure

### ECG Image Schema
Each ECG image entry contains comprehensive educational metadata:

```javascript
{
  id: 'ecg_001',
  category: 'normal|arrhythmia|acute_coronary|life_threatening|conduction',
  diagnosis: 'Human-readable diagnosis',
  url: 'https://wikimedia.org/...',
  description: 'Educational description',
  heart_rate: 'HR with units',
  pr_interval: 'PR interval with units', 
  qrs_duration: 'QRS duration with units',
  qt_interval: 'QT interval with units',
  license: 'Creative Commons license',
  source: 'Attribution source'
}
```

### Current Database (6 ECGs)

| ID | Category | Diagnosis | Source |
|----|----------|-----------|--------|
| ecg_001 | normal | Normal Sinus Rhythm | Wikimedia Commons |
| ecg_002 | arrhythmia | Atrial Fibrillation | Wikimedia Commons |
| ecg_003 | acute_coronary | Anterior STEMI | Wikimedia Commons |
| ecg_004 | life_threatening | Ventricular Tachycardia | Wikimedia Commons |
| ecg_005 | conduction | Complete Heart Block | Wikimedia Commons |
| ecg_006 | conduction | Left Bundle Branch Block | Wikimedia Commons |

## API Endpoints

### 1. Get ECG Image
```
GET /api/ecg-images/image?category=<category>&diagnosis=<diagnosis>
```

**Parameters:**
- `category` (optional): ECG category filter
- `diagnosis` (optional): Specific diagnosis search

**Response:**
```json
{
  "success": true,
  "data": {
    "image_url": "https://upload.wikimedia.org/...",
    "diagnosis": "Normal Sinus Rhythm",
    "description": "Normal 12-lead ECG showing...",
    "measurements": {
      "heart_rate": "75 bpm",
      "pr_interval": "160 ms",
      "qrs_duration": "90 ms", 
      "qt_interval": "400 ms"
    },
    "metadata": {
      "category": "normal",
      "license": "CC-BY-SA-3.0",
      "source": "Wikimedia Commons",
      "ecg_id": "ecg_001"
    }
  }
}
```

### 2. Get Categories
```
GET /api/ecg-images/categories
```

**Response:**
```json
{
  "success": true,
  "categories": [
    {
      "name": "normal",
      "count": 1,
      "diagnoses": ["Normal Sinus Rhythm"]
    },
    {
      "name": "arrhythmia", 
      "count": 1,
      "diagnoses": ["Atrial Fibrillation"]
    }
  ]
}
```

### 3. Search Database
```
GET /api/ecg-images/search?q=<query>
```

**Response:**
```json
{
  "success": true,
  "query": "atrial fibrillation",
  "results": [
    {
      "id": "ecg_002",
      "diagnosis": "Atrial Fibrillation", 
      "category": "arrhythmia",
      "relevance_score": 0.95
    }
  ],
  "total_results": 1
}
```

## Cardiac Case Detection

The case engine automatically detects cardiac rhythm cases using keyword matching:

### Detection Keywords (20+)
```javascript
const cardiacKeywords = [
  'arrhythmia', 'tachycardia', 'bradycardia', 'fibrillation', 'flutter',
  'heart block', 'bundle branch', 'st elevation', 'stemi', 'nstemi',
  'myocardial infarction', 'angina', 'cardiac', 'heart', 'rhythm',
  'palpitation', 'syncope', 'chest pain', 'coronary', 'aortic'
];
```

### Category Mapping Logic
```javascript
// Intelligent ECG category assignment
if (topic.includes('fibrillation') || topic.includes('flutter')) {
  ecgCategory = 'arrhythmia';
} else if (topic.includes('stemi') || topic.includes('st elevation')) {
  ecgCategory = 'acute_coronary';
} else if (topic.includes('ventricular tachycardia')) {
  ecgCategory = 'life_threatening';
} else if (topic.includes('heart block') || topic.includes('bundle branch')) {
  ecgCategory = 'conduction';
} else {
  ecgCategory = 'normal'; // Default fallback
}
```

### Integration Flow
1. **Case Generation**: Standard medical case created
2. **Cardiac Detection**: Keywords scanned in topic, diagnosis, history
3. **Category Assignment**: Intelligent mapping to ECG category
4. **Image Retrieval**: Relevant ECG fetched from pipeline
5. **Case Enhancement**: ECG data added to `Paraclinical_Investigations`

## Legal Compliance

### Open Source Licensing
All ECG images are sourced from reputable open-source repositories:

- **Wikimedia Commons**: CC-BY-SA-3.0 and CC-BY-SA-4.0 licenses
- **OpenECG Database**: MIT License (future expansion)
- **PhysioNet Challenge**: Open Database License (future expansion)

### Attribution Requirements
Each ECG image includes complete attribution:
- Original source URL
- License type and version  
- Creator attribution (when available)
- Date of access and verification

### Educational Use Compliance
- **Non-Commercial**: Educational platform usage
- **Attribution**: Full source crediting
- **Modification**: Allowed under CC licenses
- **Redistribution**: Compliant with open licenses

## Technical Implementation

### File Structure
```
backend/
├── utils/ecg_image_pipeline.mjs    # Core pipeline functions
├── routes/ecg_image_routes.mjs     # API endpoints 
└── routes/cases_api.mjs            # Case integration

Key Functions:
├── fetchECGImageUrl()              # Main retrieval function
├── getECGCategories()              # Category enumeration
├── searchECGDatabase()             # Text search capability
└── ECG_IMAGE_DATABASE              # Static image data
```

### Error Handling
```javascript
// Robust fallback system
try {
  ecgData = fetchECGImageUrl(category, diagnosis);
} catch (error) {
  // Log error but don't break case generation
  console.warn('ECG integration failed:', error.message);
  // Case continues without ECG image
}
```

### Performance Optimization
- **Lazy Loading**: ECG images loaded on demand
- **Caching**: Static database avoids external API calls  
- **Fallback**: Graceful degradation when images unavailable
- **Bundle Size**: Minimal impact on core application

## Quality Assurance

### Image Curation Standards
1. **Medical Accuracy**: Verified by clinical experts
2. **Image Quality**: High resolution, clear labeling
3. **Educational Value**: Representative of common patterns
4. **Legal Clearance**: Open-source license verification

### Validation Process
1. **Source Verification**: Confirm open-source status
2. **Medical Review**: Clinical accuracy validation
3. **License Check**: Legal compliance confirmation
4. **Integration Test**: API functionality verification

## Monitoring & Analytics

### Key Metrics
- **Image Load Success Rate**: Target >99%
- **API Response Time**: Target <200ms
- **Cache Hit Rate**: Monitor static data efficiency
- **Educational Impact**: ECG learning outcome correlation

### Error Tracking
- **Failed Image Loads**: Log and alert on failures
- **Invalid Categories**: Track categorization accuracy  
- **Search Relevance**: Monitor search result quality
- **Integration Errors**: Case enhancement failure rates

## Future Enhancements

### Phase F Roadmap
1. **Database Expansion**: 50+ curated ECG images
2. **Interactive Features**: Click-to-analyze ECG regions  
3. **AI-Generated ECGs**: Synthetic educational patterns
4. **Multi-Lead Support**: 12-lead ECG interpretation tools
5. **Regional Guidelines**: Location-specific ECG standards

### Scalability Considerations
- **CDN Integration**: Global image delivery optimization
- **Database Migration**: Move from static to dynamic storage
- **API Rate Limiting**: Prevent abuse of image pipeline
- **Mobile Optimization**: Touch-friendly ECG interactions

---

*This documentation provides complete technical guidance for the ECG Image Pipeline in MedPlat v15.0.0, ensuring proper implementation, legal compliance, and educational effectiveness.*