import React from "react";
import CaseView from "./components/CaseView";
import ErrorBoundary from "./components/ErrorBoundary"; // Phase 13: Global Error Handler

export default function App() {
  return (
    <ErrorBoundary>
      <CaseView />
    </ErrorBoundary>
  );
}
