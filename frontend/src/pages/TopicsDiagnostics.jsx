import React, { useEffect, useState } from "react";
import { API_BASE } from "../config";

export default function TopicsDiagnostics() {
  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchDiagnostics = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/topics2/diagnostics`);
      const data = await res.json();
      setDiagnostics(data);
      if (data.message) setMessage("From backend: " + data.message);
    } catch (err) {
      setMessage("From backend: Failed to fetch diagnostics");
    }
    setLoading(false);
  };

  // Preview changes
  const fetchPreview = async () => {
    setShowPreview(true);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/topics2/preview-changes`);
      const data = await res.json();
      setPreview(data.details || {});
      if (data.message) setMessage("From backend: " + data.message);
    } catch {
      setMessage("From backend: Failed to fetch preview");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this topic?")) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/topics2/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage("Topic deleted.");
        fetchDiagnostics();
      } else {
        setMessage("Failed to delete topic.");
      }
    } catch {
      setMessage("Failed to delete topic.");
    }
    setLoading(false);
  };

  const handleAddAcute = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/topics2/add-missing-acute`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.ok) {
        setMessage(`Added ${data.added} Acute Medicine topics.`);
        fetchDiagnostics();
      } else {
        setMessage("Failed to add topics.");
      }
    } catch {
      setMessage("Failed to add topics.");
    }
    setLoading(false);
  };

  // Approve category creation (manual only)
  const approveCategory = async (category) => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/topics2/approve-category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage(`Category '${category}' approved and created.`);
        fetchDiagnostics();
      } else {
        setMessage("Failed to approve category.");
      }
    } catch {
      setMessage("Failed to approve category.");
    }
    setLoading(false);
  };


  // Invalid topics state
  const [invalidTopics, setInvalidTopics] = useState([]);
  const [fixing, setFixing] = useState(false);
  const [deleting, setDeleting] = useState({});
  const [suggested, setSuggested] = useState({});

  // Fetch invalid topics
  const fetchInvalidTopics = async () => {
    setFixing(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/topics2/find-invalid`);
      const data = await res.json();
      if (data.ok) setInvalidTopics(data.invalid);
      else setInvalidTopics([]);
    } catch {
      setInvalidTopics([]);
    }
    setFixing(false);
  };

  // Fetch suggested missing topics
  const fetchSuggested = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/topics2/suggest-missing-topics`);
      const data = await res.json();
      setSuggested(data.suggestions || {});
    } catch {
      setSuggested({});
    }
  };

  useEffect(() => {
    fetchInvalidTopics();
    fetchSuggested();
  }, [diagnostics]);

  // Fix one topic
  const fixOneTopic = async (id) => {
    setFixing(true);
    try {
      await fetch(`${API_BASE}/api/admin/topics2/sanitizeOne`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchInvalidTopics();
      fetchDiagnostics();
    } catch {}
    setFixing(false);
  };

  // Delete one topic
  const deleteOneTopic = async (id) => {
    setDeleting((d) => ({ ...d, [id]: true }));
    try {
      await fetch(`${API_BASE}/api/admin/topics2/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchInvalidTopics();
      fetchDiagnostics();
    } catch {}
    setDeleting((d) => ({ ...d, [id]: false }));
  };

  // Fix all invalid topics
  const fixAllTopics = async () => {
    setShowModal(false);
    setFixing(true);
    for (const t of invalidTopics) {
      await fixOneTopic(t.id);
    }
    setFixing(false);
    fetchInvalidTopics();
    fetchDiagnostics();
  };

  // Humanize error reasons
  function explainErrors(errors) {
    if (!errors) return '';
    return errors.map(e => {
      if (e.startsWith('missing:')) return `Missing field: ${e.split(':')[1]}`;
      if (e.startsWith('extra:')) return `Unexpected field: ${e.split(':')[1]}`;
      if (e === 'invalid:category') return 'Category not approved';
      if (e === 'invalid:id') return 'ID does not match topic';
      if (e === 'invalid:difficulty') return 'Difficulty invalid';
      if (e === 'invalid:lang') return 'Language must be en';
      if (e === 'invalid:area') return 'Area must be string or null';
      if (e === 'invalid:keywords') return 'Keywords missing or malformed';
      if (e === 'wrongcase:category') return 'Category casing wrong';
      if (e === 'wrongcase:topic') return 'Topic casing wrong';
      if (e === 'id-topic-mismatch') return 'Topic does not match ID';
      if (e === 'orphan:topic') return 'Orphan/placeholder topic';
      return e;
    }).join('; ');
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Topics2 Diagnostics</h2>
      {message && <div className="mb-4 text-green-700">{message}</div>}
      <button onClick={fetchDiagnostics} className="bg-blue-600 text-white px-3 py-1 rounded mb-4 mr-2" disabled={loading}>Refresh</button>
      <button onClick={fetchPreview} className="bg-yellow-400 text-black px-3 py-1 rounded mb-4 mr-2" disabled={loading}>Preview Changes</button>
            {showPreview && preview && (
              <div className="mb-6 p-4 rounded" style={{ background: '#fffbe6', border: '1px solid #ffe58f' }}>
                <h3 className="font-semibold mb-2">Preview of Changes</h3>
                <div><b>Invalid topics:</b> {preview.invalidCount}</div>
                <div><b>Topics to fix:</b> {preview.fixCount}</div>
                <div><b>Topics to delete:</b> {preview.deleteCount}</div>
                <div><b>Topics with missing fields:</b> {preview.missingFieldsCount}</div>
                <div><b>Unapproved categories:</b> {preview.unapprovedCategories && preview.unapprovedCategories.length > 0 ? preview.unapprovedCategories.join(', ') : 'None'}</div>
                <div><b>Suggested new topics:</b></div>
                <ul className="ml-4">
                  {preview.suggestedTopics && Object.entries(preview.suggestedTopics).map(([cat, topics]) => (
                    <li key={cat}><b>{cat}:</b> {topics.join(', ')}</li>
                  ))}
                </ul>
              </div>
            )}
      {loading && <div className="my-4">Loading...</div>}
      {diagnostics && (
        <>
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Duplicate Topics</h3>
            {diagnostics.duplicates.length === 0 ? (
              <div className="text-green-700">No duplicates found.</div>
            ) : (
              <table className="table-auto w-full mb-2">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">ID</th>
                    <th className="border px-2 py-1">Topic</th>
                    <th className="border px-2 py-1">Category</th>
                    <th className="border px-2 py-1">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnostics.duplicates.map((d) => (
                    <tr key={d.id}>
                      <td className="border px-2 py-1">{d.id}</td>
                      <td className="border px-2 py-1">{d.topic}</td>
                      <td className="border px-2 py-1">{d.category}</td>
                      <td className="border px-2 py-1">
                        <button onClick={() => handleDelete(d.id)} className="bg-red-600 text-white px-2 py-1 rounded">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Topics with Missing Fields</h3>
            {diagnostics.missingFields.length === 0 ? (
              <div className="text-green-700">No missing fields.</div>
            ) : (
              <table className="table-auto w-full mb-2">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">ID</th>
                    <th className="border px-2 py-1">Missing Field</th>
                    <th className="border px-2 py-1">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnostics.missingFields.map((m, i) => (
                    <tr key={i}>
                      <td className="border px-2 py-1">{m.id}</td>
                      <td className="border px-2 py-1">{m.missing}</td>
                      <td className="border px-2 py-1">
                        <button onClick={() => handleDelete(m.id)} className="bg-red-600 text-white px-2 py-1 rounded">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Categories</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {diagnostics.categoriesFound && diagnostics.categoriesFound.map((cat) => (
                <span key={cat} className="bg-gray-200 px-2 py-1 rounded text-sm">{cat}</span>
              ))}
            </div>
            <h4 className="font-semibold mt-4">Categories With No Topics</h4>
            <div className="flex flex-wrap gap-2 mb-2">
              {diagnostics.categoriesWithNoTopics && diagnostics.categoriesWithNoTopics.length === 0 ? (
                <span className="text-green-700">None</span>
              ) : (
                diagnostics.categoriesWithNoTopics.map((cat) => (
                  <span key={cat} className="bg-yellow-200 px-2 py-1 rounded text-sm">{cat}</span>
                ))
              )}
            </div>
            <h4 className="font-semibold mt-4">Categories requiring approval</h4>
            <div className="flex flex-wrap gap-2 mb-2">
              {diagnostics.needsApproval && diagnostics.needsApproval.length === 0 ? (
                <span className="text-green-700">None</span>
              ) : (
                diagnostics.needsApproval.map((cat) => (
                  <span key={cat} className="bg-red-200 px-2 py-1 rounded text-sm flex items-center">
                    {cat}
                    <button onClick={() => approveCategory(cat)} className="ml-2 bg-blue-500 text-white px-2 py-0.5 rounded text-xs">Approve Category</button>
                  </span>
                ))
              )}
            </div>
          </div>
        </>
      )}
      {invalidTopics.length > 0 && (
        <div className="mb-8">
          <h3 className="font-semibold mb-2">Invalid Topics</h3>
          <button onClick={() => setShowModal(true)} className="bg-blue-700 text-white px-3 py-1 rounded mb-2" disabled={fixing}>Fix All Invalid Topics</button>
                {/* Modal for Fix All confirmation */}
                {showModal && (
                  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
                    <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full">
                      <h3 className="font-bold mb-2">Are you sure?</h3>
                      <p>This will modify Firestore. Continue?</p>
                      <div className="mt-4 flex gap-2 justify-end">
                        <button onClick={() => setShowModal(false)} className="bg-gray-300 px-3 py-1 rounded">Cancel</button>
                        <button onClick={fixAllTopics} className="bg-blue-700 text-white px-3 py-1 rounded">Yes, Fix All</button>
                      </div>
                    </div>
                  </div>
                )}
          <table className="table-auto w-full mb-2">
            <thead>
              <tr>
                <th className="border px-2 py-1">ID</th>
                <th className="border px-2 py-1">Topic</th>
                <th className="border px-2 py-1">Category</th>
                <th className="border px-2 py-1">Reason</th>
                <th className="border px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invalidTopics.map((t) => (
                <tr key={t.id}>
                  <td className="border px-2 py-1 font-mono">{t.id}</td>
                  <td className="border px-2 py-1">{t.doc && t.doc.topic}</td>
                  <td className="border px-2 py-1">{t.doc && t.doc.category}</td>
                  <td className="border px-2 py-1 text-xs text-red-700">{explainErrors(t.errors)}</td>
                  <td className="border px-2 py-1 flex gap-1">
                    <button onClick={() => fixOneTopic(t.id)} className="bg-green-600 text-white px-2 py-1 rounded" disabled={fixing}>Fix</button>
                    <button onClick={() => deleteOneTopic(t.id)} className="bg-red-600 text-white px-2 py-1 rounded" disabled={deleting[t.id]}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Suggested missing topics UI */}
      <div className="mb-8">
        <h3 className="font-semibold mb-2">Suggested Missing Topics</h3>
        <div className="bg-gray-50 p-3 rounded">
          {Object.keys(suggested).length === 0 ? <div>No suggestions.</div> : (
            <ul>
              {Object.entries(suggested).map(([cat, topics]) => (
                <li key={cat} className="mb-2">
                  <span className="font-bold">{cat}:</span> {topics.join(', ')}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Only admins can approve new categories. No auto-creation. To add a category, use the admin panel.
        </div>
      </div>
    </div>
  );
}
