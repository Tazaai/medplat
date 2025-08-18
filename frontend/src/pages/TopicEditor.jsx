import React, { useEffect, useState } from "react";
const IconPlaceholder = () => (<svg width="16" height="16" style={{background:"#ccc"}}></svg>);
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { firebaseConfig } from "../firebaseConfig";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function TopicEditor() {
  const [collectionName, setCollectionName] = useState("topics");
  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState({
    topic: "",
    category: "",
    subcategory: "",
    lang: "en",
    id: ""
  });

  const fetchTopics = async () => {
    const snapshot = await getDocs(collection(db, collectionName));
    const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setTopics(list);
  };

  const addTopic = async () => {
    if (!form.topic.trim()) return;
    const payload = {
      ...form,
      topic: form.topic.trim(),
      id: form.id || `custom_${Date.now()}`
    };
    await addDoc(collection(db, collectionName), payload);
    setForm({ topic: "", category: "", subcategory: "", lang: "en", id: "" });
    fetchTopics();
  };

  const deleteTopic = async (docId) => {
    await deleteDoc(doc(db, collectionName, docId));
    fetchTopics();
  };

  useEffect(() => {
    fetchTopics();
  }, [collectionName]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🧠 Topic Editor</h1>

      <div className="mb-4">
        <label className="mr-2 font-semibold">Collection:</label>
        <select
          value={collectionName}
          onChange={(e) => setCollectionName(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="topics">Emergency Medicine (topics)</option>
          <option value="topics2">Other Specialties (topics2)</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <input
          className="border p-2 rounded"
          placeholder="Topic"
          value={form.topic}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
        />
        <input
          className="border p-2 rounded"
          placeholder="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
        <input
          className="border p-2 rounded"
          placeholder="Subcategory"
          value={form.subcategory}
          onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
        />
        <input
          className="border p-2 rounded"
          placeholder="Language (e.g. en)"
          value={form.lang}
          onChange={(e) => setForm({ ...form, lang: e.target.value })}
        />
      </div>

      <button
        onClick={addTopic}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-6"
      >
        ➕ Add Topic
      </button>

      <ul className="divide-y border rounded">
        {topics.map((t) => (
          <li key={t.id} className="p-2 flex justify-between items-center">
            <div>
              <strong>{t.topic}</strong> — {t.category} / {t.subcategory} [{t.lang}]
            </div>
            <button
              onClick={() => deleteTopic(t.id)}
              className="text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

