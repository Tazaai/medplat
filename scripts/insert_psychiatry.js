import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  ["Major Depressive Disorder", "major_depression"],
  ["Persistent Depressive Disorder (Dysthymia)", "dysthymia"],
  ["Bipolar Disorder", "bipolar_disorder"],
  ["Generalized Anxiety Disorder", "gad"],
  ["Panic Disorder", "panic_disorder"],
  ["Social Anxiety Disorder", "social_anxiety"],
  ["Post-Traumatic Stress Disorder (PTSD)", "ptsd"],
  ["Obsessive-Compulsive Disorder (OCD)", "ocd"],
  ["Schizophrenia", "schizophrenia"],
  ["Schizoaffective Disorder", "schizoaffective_disorder"],
  ["Delusional Disorder", "delusional_disorder"],
  ["Brief Psychotic Disorder", "brief_psychosis"],
  ["Acute Psychosis", "acute_psychosis"],
  ["Attention-Deficit/Hyperactivity Disorder (ADHD)", "adhd"],
  ["Autism Spectrum Disorder", "autism_spectrum"],
  ["Conduct Disorder", "conduct_disorder"],
  ["Oppositional Defiant Disorder", "odd"],
  ["Anorexia Nervosa", "anorexia"],
  ["Bulimia Nervosa", "bulimia"],
  ["Binge Eating Disorder", "binge_eating"],
  ["Substance Use Disorder", "substance_use"],
  ["Alcohol Use Disorder", "alcohol_use"],
  ["Opioid Use Disorder", "opioid_use"],
  ["Cannabis Use Disorder", "cannabis_use"],
  ["Benzodiazepine Dependence", "benzo_dependence"],
  ["Nicotine Dependence", "nicotine_dependence"],
  ["Gambling Disorder", "gambling_disorder"],
  ["Acute Suicidality", "suicidality"],
  ["Self-Harm", "self_harm"],
  ["Psychiatric Emergency (Agitation)", "psychiatric_emergency"],
  ["Insomnia", "insomnia_psych"],
  ["Night Terrors / Sleepwalking", "parasomnia"],
  ["Adjustment Disorder", "adjustment_disorder"],
  ["Personality Disorders (General)", "personality_disorders"],
  ["Borderline Personality Disorder", "bpd"],
  ["Narcissistic Personality Disorder", "npd"],
  ["Antisocial Personality Disorder", "aspd"],
  ["Histrionic Personality Disorder", "histrionic"],
  ["Paranoid Personality Disorder", "paranoid_pd"],
  ["Psychiatric Side Effects of Medication", "psychiatric_side_effects"],
  ["Neuroleptic Malignant Syndrome", "nms"],
  ["Serotonin Syndrome", "serotonin_syndrome"],
  ["Electroconvulsive Therapy (ECT)", "ect"],
  ["Cognitive Behavioral Therapy (CBT)", "cbt"],
  ["Supportive Therapy", "supportive_therapy"],
  ["Trauma-Focused Therapy", "trauma_therapy"],
  ["Psychiatric Legal Hold / Involuntary Admission", "psychiatric_hold"]
];

async function insertPsychiatry() {
  const batch = db.batch();
  topics.forEach(([topic, id]) => {
    const ref = db.doc(`topics2/${id}`);
    batch.set(ref, {
      category: "Psychiatry",
      topic,
      id,
      lang: "en"
    });
    console.log("🧠 Inserted:", id);
  });
  await batch.commit();
  console.log("✅ All Psychiatry topics inserted.");
}

insertPsychiatry().catch(console.error);
