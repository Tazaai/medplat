// ~/medplat/frontend/src/components/CaseView.jsx
import React, { useEffect, useState } from "react";
import Level2CaseLogic from "./Level2CaseLogic";
import { useGlossary } from "./glossary/useGlossary";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://medplat-backend-139218747785.europe-west1.run.app";

async function getJsonOrThrow(res) {
  const ct = res.headers.get("content-type") || "";
  const body = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}: ${body.slice(0, 300)}`);
  if (!ct.includes("application/json")) throw new Error(`Expected JSON, got ${ct}. Body: ${body.slice(0, 300)}`);
  return JSON.parse(body);
}

const LANGUAGE_NAME = {
  en: "English", da: "Danish", de: "German", fr: "French", es: "Spanish",
  it: "Italian", ar: "Arabic", tr: "Turkish", ur: "Urdu", fa: "Farsi",
  hi: "Hindi", ru: "Russian", zh: "Chinese",
};

export default function CaseView() {
  const [lang, setLang] = useState("en");
  const [model, setModel] = useState("gpt-4o-mini");
  const [areas, setAreas] = useState([]);
  const [area, setArea] = useState("");
  const [topics, setTopics] = useState([]);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [caseData, setCaseData] = useState(null);
  const [gamify, setGamify] = useState(false);

  const { GlossaryText } = useGlossary();

  // Load Areas (categories) — POST /api/topics/categories
  useEffect(() => {
    (async () => {
      try {
        const data = await fetch(`${API_BASE}/api/topics/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lang }),
        }).then(getJsonOrThrow);

        const arr = Array.isArray(data?.categories) ? data.categories : [];
        setAreas(arr.slice().sort((a, b) => String(a).localeCompare(String(b))));
      } catch (e) {
        console.error("Failed to load areas:", e);
        setAreas([]);
      }
    })();
  }, [lang]);

  // Load Topics for selected area — POST /api/topics
  useEffect(() => {
    let cancelled = false;
    if (!area) {
      setTopics([]);
      setTopic("");
      return () => {};
    }
    (async () => {
      try {
        const data = await fetch(`${API_BASE}/api/topics`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ area, lang }),
        }).then(getJsonOrThrow);

        const items = Array.isArray(data?.topics) ? data.topics : [];
        const sorted = items
          .slice()
          .sort((a, b) => String(a.topic || a.id || "").localeCompare(String(b.topic || b.id || "")));
        if (!cancelled) {
          setTopics(sorted);
          if (!topic && sorted.length) setTopic(sorted[0]?.topic || sorted[0]?.id || "");
        }
      } catch (e) {
        if (!cancelled) setTopics([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [area, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate Case — POST /api/dialog
  const generateCase = async () => {
    if (!area || !topic) {
      alert("Please choose both Area and Topic.");
      return;
    }
    setLoading(true);
    setCaseData(null);
    try {
      const data = await fetch(`${API_BASE}/api/dialog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area,
          topic,
          language: lang,
          model,
          gamify: Boolean(gamify),
        }),
      }).then(getJsonOrThrow);

      let parsed = data?.json ?? null;

      let fullRaw =
        (typeof data.aiReply === "string" && data.aiReply) ||
        data?.aiReply?.text ||
        data?.text ||
        data?.message ||
        "";

      if (!parsed) {
        try {
          parsed = JSON.parse(fullRaw);
        } catch {
          parsed = null;
        }
      }

      let full = String(fullRaw || "");
      if (!full && parsed) {
        const lines = [];
        if (parsed?.I_PatientHistory?.presenting_complaint)
          lines.push(`I. Presenting Complaint: ${parsed.I_PatientHistory.presenting_complaint}`);
        if (parsed?.II_ObjectiveFindings?.vitals)
          lines.push(`II. Vitals: ${parsed.II_ObjectiveFindings.vitals}`);
        if (parsed?.III_ParaclinicalInvestigations?.labs)
          lines.push(`III. Labs: ${parsed.III_ParaclinicalInvestigations.labs}`);
        if (parsed?.IV_DifferentialDiagnoses?.list?.length)
          lines.push(`IV. DDx: ${parsed.IV_DifferentialDiagnoses.list.join(" • ")}`);
        if (parsed?.V_FinalDiagnosis?.diagnosis)
          lines.push(`V. Final Dx: ${parsed.V_FinalDiagnosis.diagnosis}`);
        if (parsed?.VII_ConclusionAndDiscussion?.summary)
          lines.push(`VII. Summary: ${parsed.VII_ConclusionAndDiscussion.summary}`);
        full = lines.join("\n");
      }

      setCaseData({ fullText: full || "⚠️ No case data", parsed });
    } catch (e) {
      console.error("Error generating case:", e);
      setCaseData({ fullText: "⚠️ Error generating case", parsed: null });
    } finally {
      setLoading(false);
    }
  };

  // ---- UI helpers ----
  function Field({ label, text }) {
    if (!text) return null;
    return (
      <p className="mb-1">
        <span className="font-medium">{label}: </span>
        <GlossaryText text={text} />
      </p>
    );
  }

  function List({ items }) {
    if (!Array.isArray(items) || items.length === 0) return null;
    return (
      <ul className="list-disc ml-5 space-y-1">
        {items.map((it, i) => (
          <li key={i}>
            <GlossaryText text={String(it)} />
          </li>
        ))}
      </ul>
    );
  }

  function StatsTable({ items }) {
    if (!Array.isArray(items) || items.length === 0) return null;
    return (
      <div className="overflow-x-auto">
        <table className="w-full table-auto border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border px-2 py-1 text-left">Test</th>
              <th className="border px-2 py-1 text-left">Sensitivity</th>
              <th className="border px-2 py-1 text-left">Specificity</th>
              <th className="border px-2 py-1 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((k, i) => (
              <tr key={i}>
                <td className="border px-2 py-1"><GlossaryText text={k.test} /></td>
                <td className="border px-2 py-1"><GlossaryText text={k.sensitivity} /></td>
                <td className="border px-2 py-1"><GlossaryText text={k.specificity} /></td>
                <td className="border px-2 py-1"><GlossaryText text={k.notes || ""} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function EvidenceStats({ s }) {
    if (!s) return null;
    return (
      <div className="rounded border bg-white shadow p-4">
        <h2 className="font-semibold text-lg mb-2">VIII. Evidence &amp; Statistics</h2>
        <Field label="Prevalence" text={s.prevalence} />
        <Field label="Incidence" text={s.incidence} />
        {Array.isArray(s.key_test_performance) && s.key_test_performance.length > 0 && (
          <>
            <div className="font-medium mb-1">Key Test Performance</div>
            <StatsTable items={s.key_test_performance} />
          </>
        )}
        <Field label="Prognosis" text={s.prognosis} />
        <Field label="Biphasic Reaction Rate" text={s.biphasic_reaction_rate} />
        <Field label="Recommended Observation Time" text={s.recommended_observation_time} />
      </div>
    );
  }

  function RenderStructured({ data }) {
    if (!data) return null;
    const H2 = ({ children }) => <h2 className="font-semibold text-lg mt-4 mb-2">{children}</h2>;

    return (
      <div className="rounded border bg-white shadow p-4 space-y-2">
        {data.meta?.topic && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Topic:</span> <GlossaryText text={data.meta.topic} />{" "}
            {data.meta.medical_area ? (
              <>
                • <span className="font-medium">Area:</span> <GlossaryText text={data.meta.medical_area} />
              </>
            ) : null}
          </div>
        )}

        <H2>I. Patient History</H2>
        <Field label="Presenting Complaint" text={data.I_PatientHistory?.presenting_complaint} />
        <Field label="Onset/Duration/Severity" text={data.I_PatientHistory?.onset_duration_severity} />
        <Field label="Context & Triggers" text={data.I_PatientHistory?.context_triggers} />
        <Field label="Post-event Details" text={data.I_PatientHistory?.post_event_details} />
        <Field label="Past Medical History" text={data.I_PatientHistory?.past_medical_history} />
        <Field label="Medications & Allergies" text={data.I_PatientHistory?.medications_allergies} />

        <H2>II. Objective Clinical Findings</H2>
        <Field label="Vitals" text={data.II_ObjectiveFindings?.vitals} />
        <Field label="Orthostatic Vitals" text={data.II_ObjectiveFindings?.orthostatic_vitals} />
        <Field label="Physical Exam" text={data.II_ObjectiveFindings?.physical_exam} />
        <Field label="Risk Factors" text={data.II_ObjectiveFindings?.risk_factors} />
        <Field label="Exposures" text={data.II_ObjectiveFindings?.exposures} />
        <Field label="Family Disposition" text={data.II_ObjectiveFindings?.family_disposition} />

        <H2>III. Paraclinical Investigations</H2>
        <Field label="Labs" text={data.III_ParaclinicalInvestigations?.labs} />
        <Field label="ECG" text={data.III_ParaclinicalInvestigations?.ecg} />
        <Field label="Imaging" text={data.III_ParaclinicalInvestigations?.imaging} />
        <Field label="Other Tests" text={data.III_ParaclinicalInvestigations?.other_tests} />

        <H2>IV. Differential Diagnoses</H2>
        <List items={data.IV_DifferentialDiagnoses?.list} />
        {Array.isArray(data.IV_DifferentialDiagnoses?.red_flags) && data.IV_DifferentialDiagnoses.red_flags.length > 0 && (
          <div className="mt-2">
            <div className="font-medium">Red Flags:</div>
            <List items={data.IV_DifferentialDiagnoses.red_flags} />
          </div>
        )}

        <H2>V. Final Diagnosis</H2>
        <Field label="Diagnosis" text={data.V_FinalDiagnosis?.diagnosis} />
        <Field label="Criteria/Rationale" text={data.V_FinalDiagnosis?.criteria_or_rationale} />

        <H2>VI. Pathophysiology</H2>
        <Field label="Mechanism" text={data.VI_Pathophysiology?.mechanism} />
        <Field label="Systems/Organs" text={data.VI_Pathophysiology?.systems_or_organs} />

        <H2>VI.b Etiology</H2>
        <Field label="Underlying Cause" text={data.VIb_Etiology?.underlying_cause} />

        <H2>VII. Conclusion & Discussion</H2>
        <Field label="Summary" text={data.VII_ConclusionAndDiscussion?.summary} />
        <Field label="Immediate Management" text={data.VII_ConclusionAndDiscussion?.immediate_management} />
        <Field label="Discharge vs Admit Criteria" text={data.VII_ConclusionAndDiscussion?.discharge_vs_admit_criteria} />
        <Field label="Disposition & Follow-up" text={data.VII_ConclusionAndDiscussion?.disposition_and_followup} />
        {Array.isArray(data.VII_ConclusionAndDiscussion?.references) && data.VII_ConclusionAndDiscussion.references.length > 0 && (
          <div className="mt-1">
            <div className="font-medium">References:</div>
            <List items={data.VII_ConclusionAndDiscussion.references} />
          </div>
        )}

        <EvidenceStats s={data.VIII_EvidenceAndStatistics} />

        {data.TeachingAndGamification && (
          <>
            <h2 className="font-semibold text-lg mt-4 mb-2">Teaching & Gamification</h2>
            <Field label="Clinical Reasoning Notes" text={data.TeachingAndGamification?.clinical_reasoning_notes} />
            {Array.isArray(data.TeachingAndGamification?.mnemonics_or_pearls) &&
              data.TeachingAndGamification.mnemonics_or_pearls.length > 0 && (
                <>
                  <div className="font-medium">Mnemonics / Pearls:</div>
                  <List items={data.TeachingAndGamification.mnemonics_or_pearls} />
                </>
              )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Generate Patient History</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Language</label>
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="p-2 rounded border w-full">
            {Object.keys(LANGUAGE_NAME).map((code) => (
              <option key={code} value={code}>{LANGUAGE_NAME[code]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Model</label>
          <select value={model} onChange={(e) => setModel(e.target.value)} className="p-2 rounded border w-full">
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4">GPT-4</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">Area</label>
        <select value={area} onChange={(e) => setArea(e.target.value)} className="p-2 rounded border w-full">
          <option value="">-- Choose Area --</option>
          {areas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm mb-1">Topic</label>
        <select value={topic} onChange={(e) => setTopic(e.target.value)} className="p-2 rounded border w-full" disabled={!area}>
          <option value="">-- Choose Topic --</option>
          {topics.map((t) => (
            <option key={String(t.id || t.topic)} value={String(t.topic || t.id)}>
              {String(t.topic || t.id)}
            </option>
          ))}
        </select>
      </div>

      <label className="inline-flex items-center gap-2">
        <input type="checkbox" checked={gamify} onChange={(e) => setGamify(e.target.checked)} />
        <span>Enable gamification (interactive mode)</span>
      </label>

      <button onClick={generateCase} disabled={!topic || loading} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
        {loading ? "Generating..." : "🔄 Generate History"}
      </button>

      {caseData &&
        (gamify ? (
          <Level2CaseLogic text={caseData.fullText} gamify={true} caseId={topic} model={model} />
        ) : caseData.parsed ? (
          <RenderStructured data={caseData.parsed} />
        ) : (
          <div className="mt-4 whitespace-pre-wrap border p-4 bg-white rounded shadow">
            <GlossaryText text={caseData.fullText} />
          </div>
        ))}
    </div>
  );
}
