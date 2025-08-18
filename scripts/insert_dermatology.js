import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  ["Acne Vulgaris", "acne"],
  ["Rosacea", "rosacea"],
  ["Eczema (Atopic Dermatitis)", "eczema"],
  ["Psoriasis", "psoriasis"],
  ["Seborrheic Dermatitis", "seborrheic_dermatitis"],
  ["Contact Dermatitis", "contact_dermatitis"],
  ["Urticaria (Hives)", "urticaria"],
  ["Drug Eruption", "drug_eruption"],
  ["Vitiligo", "vitiligo"],
  ["Tinea Corporis", "tinea_corporis"],
  ["Tinea Capitis", "tinea_capitis"],
  ["Tinea Pedis", "tinea_pedis"],
  ["Tinea Versicolor", "tinea_versicolor"],
  ["Onychomycosis", "onychomycosis"],
  ["Scabies", "scabies"],
  ["Lice Infestation (Pediculosis)", "pediculosis"],
  ["Herpes Simplex (Oral/Genital)", "herpes_simplex"],
  ["Varicella Zoster (Shingles)", "herpes_zoster"],
  ["Impetigo", "impetigo"],
  ["Cellulitis", "cellulitis"],
  ["Erysipelas", "erysipelas"],
  ["Warts (Verruca Vulgaris)", "warts"],
  ["Molluscum Contagiosum", "molluscum"],
  ["Melanoma", "melanoma"],
  ["Basal Cell Carcinoma", "bcc"],
  ["Squamous Cell Carcinoma", "scc"],
  ["Actinic Keratosis", "actinic_keratosis"],
  ["Seborrheic Keratosis", "seborrheic_keratosis"],
  ["Hidradenitis Suppurativa", "hidradenitis_suppurativa"],
  ["Alopecia Areata", "alopecia_areata"],
  ["Androgenetic Alopecia", "androgenetic_alopecia"],
  ["Keloids", "keloids"],
  ["Lichen Planus", "lichen_planus"],
  ["Cutaneous Lupus", "cutaneous_lupus"],
  ["Dermatomyositis", "dermatomyositis"],
  ["Photosensitivity Rash", "photosensitive_rash"],
  ["Hyperpigmentation", "hyperpigmentation"],
  ["Skin Abscess", "skin_abscess"],
  ["Necrotizing Fasciitis", "necrotizing_fasciitis"],
  ["Stevens-Johnson Syndrome", "stevens_johnson"]
];

async function insertDermatology() {
  const batch = db.batch();
  topics.forEach(([topic, id]) => {
    const ref = db.doc(`topics2/${id}`);
    batch.set(ref, {
      category: "Dermatology",
      topic,
      id,
      lang: "en"
    });
    console.log("🧴 Inserted:", id);
  });
  await batch.commit();
  console.log("✅ All Dermatology topics inserted.");
}

insertDermatology().catch(console.error);
