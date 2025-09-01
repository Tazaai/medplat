// ~/medplat/backend/routes/location_api.mjs
import express from "express";
import fetch from "node-fetch";

export default function locationApi() {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      // Try to extract client IP
      const ip =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket.remoteAddress ||
        "";

      // Use free IP lookup service (ipapi.co)
      const geo = await fetch(`https://ipapi.co/${ip}/json/`).then((r) =>
        r.json()
      );

      res.json({
        ip,
        country: geo.country_name || geo.country || null,
        city: geo.city || null,
        region: geo.region || null,
      });
    } catch (e) {
      console.error("❌ Location lookup failed:", e.message);
      res.json({ country: "unspecified" });
    }
  });

  return router;
}
