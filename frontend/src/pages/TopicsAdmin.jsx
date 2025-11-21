import React, { useEffect, useState } from "react";
import { API_BASE } from "../config";

export default function TopicsAdmin() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [topics, setTopics] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [renameCategory, setRenameCategory] = useState("");
  const [editTopic, setEditTopic] = useState(null);
  const [editTopicData, setEditTopicData] = useState({});
  const [message, setMessage] = useState("");

  // Load categories
  useEffect(() => {
    fetch(`${API_BASE}/api/topics2/categories`)
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []));
  }, [message]);

  // Load topics for selected category
  useEffect(() => {
    if (!selectedCategory) return setTopics([]);
    fetch(`${API_BASE}/api/topics2/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: selectedCategory }),
    })
      .then((res) => res.json())
      .then((data) => setTopics(data.topics || []));
  }, [selectedCategory, message]);

  // Add new category
  const handleAddCategory = async () => {
    if (!newCategory) return;
    const res = await fetch(`${API_BASE}/api/topics2/admin/add-category`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: newCategory }),
    });
    const data = await res.json();
    setMessage(data.ok ? `Category '${newCategory}' added.` : "Failed to add category.");
    setNewCategory("");
  };

  // Rename category
  const handleRenameCategory = async () => {
    if (!selectedCategory || !renameCategory) return;
    const res = await fetch(`${API_BASE}/api/topics2/admin/rename-category`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldName: selectedCategory, newName: renameCategory }),
    });
    const data = await res.json();
    setMessage(data.ok ? `Category renamed to '${renameCategory}'.` : "Failed to rename category.");
    setRenameCategory("");
    setSelectedCategory("");
  };

  // Delete category
  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    if (!window.confirm(`Delete category '${selectedCategory}' and all its topics?`)) return;
    const res = await fetch(`${API_BASE}/api/topics2/admin/delete-category`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: selectedCategory }),
    });
    const data = await res.json();
    setMessage(data.ok ? `Category '${selectedCategory}' deleted.` : "Failed to delete category.");
    setSelectedCategory("");
  };

  // Edit topic
  const handleEditTopic = (topic) => {
    setEditTopic(topic.id);
    setEditTopicData({ ...topic });
  };

  // Save topic changes
  const handleSaveTopic = async () => {
    const res = await fetch(`${API_BASE}/api/topics2/admin/update-topic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editTopic, data: editTopicData }),
    });
    const data = await res.json();
    setMessage(data.ok ? "Topic updated." : "Failed to update topic.");
    setEditTopic(null);
  };

  // Delete topic
  const handleDeleteTopic = async (id) => {
    if (!window.confirm("Delete this topic?")) return;
    const res = await fetch(`${API_BASE}/api/topics2/admin/delete-topic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    setMessage(data.ok ? "Topic deleted." : "Failed to delete topic.");
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Topics2 Admin Panel</h2>
      {message && <div className="mb-4 text-green-700">{message}</div>}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New category name"
          className="border p-2 rounded"
        />
        <button onClick={handleAddCategory} className="bg-blue-600 text-white px-3 py-1 rounded">Add Category</button>
      </div>
      <div className="mb-6">
        <label className="block mb-1 font-semibold">Categories:</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="">-- Select Category --</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        {selectedCategory && (
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={renameCategory}
              onChange={(e) => setRenameCategory(e.target.value)}
              placeholder="Rename category"
              className="border p-2 rounded"
            />
            <button onClick={handleRenameCategory} className="bg-yellow-500 text-white px-3 py-1 rounded">Rename</button>
            <button onClick={handleDeleteCategory} className="bg-red-600 text-white px-3 py-1 rounded">Delete</button>
          </div>
        )}
      </div>
      {selectedCategory && (
        <div>
          <h3 className="font-bold mb-2">Topics in '{selectedCategory}'</h3>
          <table className="table-auto w-full mb-4">
            <thead>
              <tr>
                <th className="border px-2 py-1">Topic</th>
                <th className="border px-2 py-1">Keywords</th>
                <th className="border px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((t) => (
                <tr key={t.id}>
                  <td className="border px-2 py-1">
                    {editTopic === t.id ? (
                      <input
                        type="text"
                        value={editTopicData.topic || ""}
                        onChange={(e) => setEditTopicData({ ...editTopicData, topic: e.target.value })}
                        className="border p-1 rounded w-full"
                      />
                    ) : (
                      t.topic
                    )}
                  </td>
                  <td className="border px-2 py-1">
                    {editTopic === t.id ? (
                      <input
                        type="text"
                        value={editTopicData.keywords?.join(", ") || ""}
                        onChange={(e) => setEditTopicData({ ...editTopicData, keywords: e.target.value.split(",").map(s => s.trim()) })}
                        className="border p-1 rounded w-full"
                      />
                    ) : (
                      (t.keywords || []).join(", ")
                    )}
                  </td>
                  <td className="border px-2 py-1">
                    {editTopic === t.id ? (
                      <>
                        <button onClick={handleSaveTopic} className="bg-green-600 text-white px-2 py-1 rounded mr-1">Save</button>
                        <button onClick={() => setEditTopic(null)} className="bg-gray-400 text-white px-2 py-1 rounded">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEditTopic(t)} className="bg-blue-500 text-white px-2 py-1 rounded mr-1">Edit</button>
                        <button onClick={() => handleDeleteTopic(t.id)} className="bg-red-600 text-white px-2 py-1 rounded">Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
