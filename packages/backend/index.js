import express from "express";
import admin from "firebase-admin";
import cors from "cors";
import topicsApi from "./routes/topics_api.mjs";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
} catch (e) {
  if (!/already exists/u.test(e.message)) {
    throw new Error("Firebase initialization error", e);
  }
}

const db = admin.firestore();

app.get("/", (req, res) => res.send("Medplat backend is running"));

app.route("/api/topics")
  .get(topicsApi(db))
  .post(topicsApi(db));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server running on port ${port}`));
