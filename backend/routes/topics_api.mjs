export default function (db) {
  return async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { lang, collection = "topics" } = req.body;
    if (!lang || !collection) return res.status(400).json({ topics: [], error: "Missing lang or collection" });

    try {
      const snapshot = await db.collection(collection).where("lang", "==", lang).get();
      const topics = snapshot.docs.map(doc => doc.data());
      res.json({ topics });
    } catch (err) {
      console.error("🔥 Error fetching topics:", err);
      res.status(500).json({ topics: [], error: err.message });
    }
  };
}
