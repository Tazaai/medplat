// your full CaseView.jsx content here, replacing only the fetch part with:
const response = await fetch("https://medplat-backend-458911.europe-west1.run.app/api/topics", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ lang: selectedLanguage, collection: selectedArea === 'em' ? 'topics' : 'topics2' })
});
const data = await response.json();
setAvailableTopics(data.topics || []);
