import React, { useState } from 'react';

export default function DialogChat({ onSend }) {
  const [text, setText] = useState('');

  const send = () => {
    if (!text.trim()) return;
    onSend && onSend(text.trim());
    setText('');
  };

  return (
    <div className="p-2 border rounded">
      <textarea
        className="w-full p-2 border rounded"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask the AI about this case..."
      />
      <div className="mt-2 flex justify-end">
        <button className="px-3 py-1 bg-blue-500 text-white rounded" onClick={send}>Send</button>
      </div>
    </div>
  );
}
