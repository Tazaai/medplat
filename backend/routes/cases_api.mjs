// ~/medplat/backend/routes/cases_api.mjs
import express from "express";
import admin from "../firebase.js";
import { v4 as uuidv4 } from "uuid";
import PDFDocument from "pdfkit";

console.log("✅ cases_api.mjs LOADED");

export default function casesApi() {
  const router = express.Router();

  // ✅ Save a generated case
  router.post("/save", async (req, res) => {
    try {
      const { caseData, rating = 0, userAction = "save" } = req.body;

      if (!caseData || !caseData.meta) {
        return res.status(400).json({ error: "Invalid caseData" });
      }

      const { category, id: topic_id, topic, lang = "en" } = caseData.meta;

      if (!category || !topic_id) {
        return res.status(400).json({ error: "Missing category or topic_id in caseData.meta" });
      }

      // ⭐ only save if criteria met
      if (rating < 3 && userAction !== "save" && userAction !== "share") {
        return res.status(200).json({ ok: false, reason: "Not saved (criteria not met)" });
      }

      const instance_id = uuidv4();
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // ⏳ +12 months

      const db = admin.firestore();
      const ref = db
        .collection("saved_cases")
        .doc(category)
        .collection(topic_id)
        .doc(instance_id);

      const payload = {
        category,
        id: topic_id,
        topic,
        lang,
        instance_id,
        model: caseData.model || "gpt-4o-mini",
        saved_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        rating,
        userAction,
        case: caseData
      };

      await ref.set(payload);

      return res.status(200).json({
        ok: true,
        instance_id,
        shareUrl: `/api/cases/share/${instance_id}`,
        pdfUrl: `/api/cases/pdf/${instance_id}`,
        message: "Case saved successfully"
      });

    } catch (err) {
      console.error("❌ Error saving case:", err);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // ✅ Share endpoint → return JSON case
  router.get("/share/:instance_id", async (req, res) => {
    try {
      const { instance_id } = req.params;
      const db = admin.firestore();

      // brute force search across categories
      const snap = await db.collectionGroup("topic_id").where("instance_id", "==", instance_id).get();

      if (snap.empty) {
        return res.status(404).json({ error: "Case not found" });
      }

      const doc = snap.docs[0].data();
      return res.status(200).json({ ok: true, case: doc });
    } catch (err) {
      console.error("❌ Error fetching shared case:", err);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // ✅ PDF export endpoint
  router.get("/pdf/:instance_id", async (req, res) => {
    try {
      const { instance_id } = req.params;
      const db = admin.firestore();

      const snap = await db.collectionGroup("topic_id").where("instance_id", "==", instance_id).get();

      if (snap.empty) {
        return res.status(404).json({ error: "Case not found" });
      }

      const caseData = snap.docs[0].data().case;

      // Generate PDF
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="case_${instance_id}.pdf"`);

      const doc = new PDFDocument();
      doc.pipe(res);

      doc.fontSize(18).text(`Case Report: ${caseData.meta.topic}`, { underline: true });
      doc.moveDown();

      doc.fontSize(12).text(`Category: ${caseData.meta.category || "N/A"}`);
      doc.text(`Language: ${caseData.meta.lang}`);
      doc.text(`Generated: ${caseData.saved_at || "N/A"}`);
      doc.moveDown();

      for (const [section, content] of Object.entries(caseData)) {
        if (typeof content === "object") {
          doc.fontSize(14).text(section, { bold: true });
          doc.moveDown(0.5);
          doc.fontSize(12).text(JSON.stringify(content, null, 2));
          doc.moveDown();
        }
      }

      doc.end();
    } catch (err) {
      console.error("❌ Error generating PDF:", err);
      return res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}
