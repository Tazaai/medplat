import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  ["Mass Casualty Triage", "mass_casualty_triage"],
  ["START Triage System", "start_triage_system"],
  ["CBRN Events (Chemical, Biological, Radiological, Nuclear)", "cbrn_events"],
  ["Decontamination Protocols", "decontamination_protocols"],
  ["Disaster Ethics", "disaster_ethics"],
  ["Emergency Preparedness", "emergency_preparedness"],
  ["Hospital Evacuation", "hospital_evacuation"],
  ["Burn Triage and Management", "burn_management_disaster"],
  ["Blast Injuries", "blast_injuries"],
  ["Crush Syndrome", "crush_syndrome"],
  ["Radiation Exposure", "radiation_exposure"],
  ["Bioterrorism Agents (e.g., Anthrax, Botulinum)", "bioterrorism_agents"],
  ["Pandemic Management", "pandemic_management"],
  ["Mass Vaccination Strategy", "mass_vaccination_strategy"],
  ["Medical Resource Rationing", "medical_resource_rationing"],
  ["Psychological First Aid", "psychological_first_aid"],
  ["Critical Infrastructure Failure", "critical_infrastructure_failure"],
  ["Disaster Logistics", "disaster_logistics"],
  ["Field Hospital Setup", "field_hospital_setup"],
  ["Humanitarian Response", "humanitarian_response"],
  ["Crowd Control Medical Strategy", "crowd_control_medical"],
  ["Post-Traumatic Stress in Responders", "ptsd_responders"],
  ["Epidemic Surveillance", "epidemic_surveillance"],
  ["Search and Rescue Medicine", "search_and_rescue_medicine"],
  ["Telemedicine in Disasters", "telemedicine_disasters"],
  ["Gadeberg Syndrome", "gadeberg_syndrome"],
  ["Nuclear Plant Incident", "nuclear_incident"],
  ["Earthquake Trauma Care", "earthquake_trauma"],
  ["Flood-related Infections", "flood_infections"],
  ["Tsunami Injury Patterns", "tsunami_injuries"],
  ["Extreme Weather Response", "extreme_weather_response"],
  ["Drowning & Submersion", "drowning_submersion"],
  ["Civil Unrest Triage", "civil_unrest_triage"],
  ["Ethical Dilemmas in Disaster", "disaster_ethics_cases"],
  ["Elderly in Disasters", "elderly_in_disasters"],
  ["Children in Disasters", "children_in_disasters"],
  ["Pregnancy in Disasters", "pregnancy_in_disasters"],
  ["Medical Supply Chain Disruption", "supply_chain_disaster"],
  ["Contingency Planning", "contingency_planning"],
  ["Burnout in Disaster Teams", "burnout_disaster_teams"],
  ["Simulation Training", "disaster_simulation_training"]
];

async function insertDisasterTopics() {
  const batch = db.batch();
  topics.forEach(([topic, id]) => {
    const ref = db.doc(`topics2/${id}`);
    batch.set(ref, {
      category: "Disaster & Crisis Response",
      topic,
      id,
      lang: "en"
    });
    console.log("🌪️ Inserted:", id);
  });
  await batch.commit();
  console.log("✅ All Disaster & Crisis topics inserted.");
}

insertDisasterTopics().catch(console.error);
