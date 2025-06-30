const chatbox = document.getElementById('chatbox');
const userInput = document.getElementById('userInput');
const suggestionsDiv = document.getElementById('suggestions');

function appendMsg(sender, msg) {
  const div = document.createElement('div');
  div.textContent = `${sender}: ${msg}`;
  div.style.margin = '5px 0';
  chatbox.appendChild(div);
  chatbox.scrollTop = chatbox.scrollHeight;
}

function sendMessage(text = null) {
  const message = text || userInput.value;
  if (!message) return;
  appendMsg('👤', message);
  userInput.value = '';

  fetch('/api/dialog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userMessage: message })
  })
    .then(res => res.json())
    .then(data => {
      appendMsg('🤖', data.aiReply);
      showSuggestions();
    });
}

function showSuggestions() {
  suggestionsDiv.innerHTML = '';
  const buttons = ['Bestil EKG', 'Se vitalværdier', 'Objektiv undersøgelse', 'Giv ilt'];
  buttons.forEach(text => {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.onclick = () => sendMessage(text);
    suggestionsDiv.appendChild(btn);
  });
}
