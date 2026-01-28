import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import Redis from "ioredis";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ Redis (external, OK for free tier)
const redis = new Redis(process.env.REDIS_URL);

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (e) => console.error("❌ Redis error", e));

// 🔥 Health check (IMPORTANT for Render)
app.get("/", (req, res) => {
  res.send("OK");
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

// ✅ Render provides PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
