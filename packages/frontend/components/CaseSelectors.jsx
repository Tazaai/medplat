import React from "react";
import React from "react"
import React, { useEffect, useState } from "react";

const API_BASE = "https://medplat-backend-458911.europe-west1.run.app";

const CaseSelectors = ({ area, lang, setTopics }) => {
  const getCollectionName = (area) => {
    return area === "EM" ? "topics" : "topics2";
  };

  const fetchTopics = async () => {
    const collection = getCollectionName(area);
    const response = await fetch(`${API_BASE}/api/topics`, { method: "POST", 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang, area, collection }),
    });
    const data = await response.json();
    setTopics(data.topics || []);
  };

  useEffect(() => {
    fetchTopics();
  }, [area, lang]);

  return (
    <div>
      <h2>Available Topics</h2>
      {/* UI to display topics can go here */}
    </div>
  );
};

export default CaseSelectors;
console.log("Fetching topics from:", backendUrl + "/api/topics");
