import React, { useState } from "react";
const IconPlaceholder = () => (<svg width="16" height="16" style={{background:"#ccc"}}></svg>);

export default function DialogChat() {
  const [input, setInput] = useState("");
  const [log, setLog] = useState([]);

  const send = () => {
    if (!input.trim()) return;
    const userInput = input.trim();
    setLog(prev => [...prev, { role: "user", content: userInput }]);
    setInput("");

    fetch("https://medplat-backend-139218747785.europe-west1.run.app/api/dialog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: userInput, niveau: "simpel", lang: "da" })
    })
      .then(res => res.json())
      .then(data => {
        const content = typeof data.aiReply === "string" ? data.aiReply : JSON.stringify(data);
        setLog(prev => [...prev, { role: "ai", content }]);
      });
  };

  return (
    <div className="mt-6 p-4 bg-gray-100 rounded">
      <h3 className="text-lg font-semibold mb-2">💬 Dialog</h3>
      <div className="mb-2">
        {log.map((msg, idx) => (
          <div key={idx} className={`mb-1 ${msg.role === "ai" ? "text-blue-800" : "text-black"}`}>
            <strong>{msg.role === "ai" ? "AI" : "You"}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === "Enter" && send()}
        placeholder="Ask a what-if or comment..."
        className="border p-2 rounded w-full"
      />
    </div>
  );
}
