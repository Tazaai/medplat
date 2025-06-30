import React, { useEffect, useState } from "react";

export default function Home() {
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    fetch("https://medplat-backend-458911.europe-west1.run.app/api/topics")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTopics(data);
        } else {
          console.warn("Invalid response format:", data);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div>
      <h1>Available Topics</h1>
      {topics.length > 0 ? (
        <ul>
          {topics.map((t, i) => (
            <li key={i}>{t.topic} ({t.subcategory})</li>
          ))}
        </ul>
      ) : (
        <p>No topics found.</p>
      )}
    </div>
  );
}
