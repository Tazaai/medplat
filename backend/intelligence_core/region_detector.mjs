export async function detectRegion(req) {
    try {
        let detected = null;
        
        // 1. Cloud Run header
        const h1 = req.headers["x-appengine-country"];
        if (h1 && h1 !== "ZZ") {
            detected = h1.toLowerCase();
        }
        
        // 2. Cloudflare / reverse proxy header
        const h2 = req.headers["cf-ipcountry"];
        if (h2 && h2 !== "T1") {
            detected = h2.toLowerCase();
        }
        
        // Return detected region or global fallback
        return detected || "global";
    } catch {
        return "global"; // global fallback
    }
}
