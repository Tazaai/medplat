import React from "react";
const IconPlaceholder = () => (<svg width="16" height="16" style={{background:"#ccc"}}></svg>);
import ReactDOM from "react-dom/client";
import CaseView from "./components/CaseView.jsx";
import "./index.css"; // ✅ Ensure basic styles are applied

import { signInAnonymously } from "firebase/auth";
import { auth } from "./firebaseConfig";

// ✅ Automatically sign in users anonymously
signInAnonymously(auth).catch((error) => {
  console.error("❌ Anonymous login failed:", error.message);
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CaseView />
  </React.StrictMode>
);
