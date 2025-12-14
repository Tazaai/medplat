import React, { useState } from "react";
import CaseView from "./components/CaseView";
import InteractiveCaseGenerator from "./components/InteractiveCaseGenerator";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext"; // ✅ Auth context

export default function App() {
  const [route, setRoute] = useState(window.location.hash.replace('#','') || 'case');
  React.useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash.replace('#','') || 'case');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <AuthProvider>
      <ErrorBoundary>
        {route === 'case' && <CaseView />}
        {route === 'interactive' && <InteractiveCaseGenerator />}
      </ErrorBoundary>
    </AuthProvider>
  );
}
