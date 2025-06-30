import React, { useState } from "react";

export default function DialogChat() {
  const [messages, setMessages] = useState([
    { sender: "ai", text: "👋 Welcome! What would you like to ask about?" }
  ]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { sender: "user", text: trimmed }]);
    setInput("");
    try {
      const res = await fetch("https://medplat-backend-458911.europe-west1.run.app/api/dialog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: trimmed }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { sender: "ai", text: data.aiReply }]);
    } catch {
      setMessages((prev) => [...prev, { sender: "ai", text: "❌ Error contacting AI." }]);
    }
  };

  return (
    <div className="p-4 bg-gray-100 rounded">
      <div className="mb-2">
        {messages.map((m, i) => (
          <p key={i} className={m.sender === "user" ? "text-right" : "text-left"}>
            <span className={m.sender === "user" ? "text-blue-600" : "text-green-700"}>{m.text}</span>
          </p>
        ))}
      </div>
      <input
        className="border p-2 rounded w-full"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        placeholder="Type your message..."
      />
      <button onClick={sendMessage} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded">
        Send
      </button>
    </div>
  );
}
