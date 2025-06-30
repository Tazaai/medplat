import express from "express";
import admin from "firebase-admin";
import topicsApi from "./routes/topics_api.mjs";

const app = express();
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});
const db = admin.firestore();

app.post("/api/topics", topicsApi(db));

app.get("/", (req, res) => res.send("Backend is working"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
