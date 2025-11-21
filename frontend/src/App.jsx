
import React, { useState } from "react";
import CaseView from "./components/CaseView";
import ErrorBoundary from "./components/ErrorBoundary";
import TopicsAdmin from "./pages/TopicsAdmin";
import TopicsDiagnostics from "./pages/TopicsDiagnostics";

export default function App() {
  const [route, setRoute] = useState(window.location.hash.replace('#','') || 'case');
  React.useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash.replace('#','') || 'case');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <ErrorBoundary>
      <div className="w-full flex justify-end p-2">
        <button
          className="text-xs px-2 py-1 bg-gray-200 rounded mr-2"
          onClick={() => window.location.hash = 'case'}
        >Case Generator</button>
        <button
          className="text-xs px-2 py-1 bg-gray-200 rounded mr-2"
          onClick={() => window.location.hash = 'admin'}
        >Topics Admin</button>
        <button
          className="text-xs px-2 py-1 bg-yellow-300 rounded"
          onClick={() => window.location.hash = 'admin-diagnostics'}
        >Diagnostics</button>
      </div>
      {route === 'admin' ? <TopicsAdmin /> :
        route === 'admin-diagnostics' ? <TopicsDiagnostics /> :
        <CaseView />}
    </ErrorBoundary>
  );
}
