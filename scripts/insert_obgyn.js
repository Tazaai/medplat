import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  ["Prenatal Care", "prenatal_care"],
  ["First Trimester Bleeding", "first_trimester_bleeding"],
  ["Ectopic Pregnancy", "ectopic_pregnancy"],
  ["Gestational Trophoblastic Disease", "gtd"],
  ["Hyperemesis Gravidarum", "hyperemesis_gravidarum"],
  ["Gestational Diabetes", "gestational_diabetes"],
  ["Gestational Hypertension", "gestational_hypertension"],
  ["Preeclampsia", "preeclampsia"],
  ["Eclampsia", "eclampsia"],
  ["HELLP Syndrome", "hellp_syndrome"],
  ["Placenta Previa", "placenta_previa"],
  ["Placental Abruption", "placental_abruption"],
  ["Preterm Labor", "preterm_labor"],
  ["Premature Rupture of Membranes (PROM)", "prom"],
  ["Intrauterine Growth Restriction (IUGR)", "iugr"],
  ["Postpartum Hemorrhage", "pph"],
  ["Postpartum Depression", "postpartum_depression"],
  ["Breastfeeding Support", "breastfeeding_support"],
  ["Contraceptive Counseling", "contraception"],
  ["Menstrual Irregularities", "menstrual_irregularities"],
  ["Polycystic Ovary Syndrome (PCOS)", "pcos"],
  ["Endometriosis", "endometriosis"],
  ["Uterine Fibroids", "fibroids"],
  ["Ovarian Cysts", "ovarian_cysts"],
  ["Pelvic Inflammatory Disease (PID)", "pid"],
  ["Cervical Dysplasia", "cervical_dysplasia"],
  ["Cervical Cancer", "cervical_cancer"],
  ["Endometrial Cancer", "endometrial_cancer"],
  ["Ovarian Cancer", "ovarian_cancer"],
  ["Menopause", "menopause"],
  ["Hormone Replacement Therapy", "hrt"],
  ["Infertility Evaluation", "infertility"],
  ["Sexually Transmitted Infections (STIs)", "stis_obgyn"],
  ["Vaginitis (Yeast/Bacterial/Trich)", "vaginitis"],
  ["Pelvic Organ Prolapse", "pelvic_prolapse"],
  ["Urinary Incontinence (Female)", "incontinence_female"],
  ["Routine Pap Smear", "routine_pap"],
  ["HPV Vaccination", "hpv_vaccine"],
  ["Abortion Counseling", "abortion"],
  ["Stillbirth and Grief Support", "stillbirth_support"]
];

async function insertObGyn() {
  const batch = db.batch();
  topics.forEach(([topic, id]) => {
    const ref = db.doc(`topics2/${id}`);
    batch.set(ref, {
      category: "Obstetrics & Gynecology",
      topic,
      id,
      lang: "en"
    });
    console.log("🤰 Inserted:", id);
  });
  await batch.commit();
  console.log("✅ All Obstetrics & Gynecology topics inserted.");
}

insertObGyn().catch(console.error);
