const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;

/* =========================
   IN-MEMORY SESSION
========================= */
let sessionData = {
  rejectedPlaceIds: []
};

/* =========================
   TEST ROUTE
========================= */
app.get("/", (req, res) => {
  res.send("VibeGo backend running 🚀");
});

/* =========================
   DATA CLEANING
========================= */
function cleanPlaceData(elements) {
  return elements
    .filter(el => el.tags && el.tags.name && el.lat && el.lon)
    .map(el => ({
      id: el.id,
      name: el.tags.name,
      category:
        el.tags.amenity ||
        el.tags.leisure ||
        el.tags.tourism ||
        "other",
      lat: el.lat,
      lng: el.lon
    }));
}

/* =========================
   DISTANCE (KM)
========================= */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* =========================
   TRANSPORT ETA (MINUTES)
========================= */
function estimateTravelTime(distanceKm, mode) {
  const speedMap = {
    walk: 5,
    bike: 15,
    car: 25,
    bus: 20
  };

  const speed = speedMap[mode] || 20;
  return Math.round((distanceKm / speed) * 60);
}

/* =========================
   RANKING ENGINE
========================= */
function rankPlaces(places, userLat, userLng, group, maxDist, transport) {
  const groupPreferences = {
    solo: ["cafe"],
    friends: ["restaurant", "cafe", "fast_food", "leisure"],
    couple: ["cafe", "leisure"],
    family: ["restaurant"],
    colleagues: ["cafe", "restaurant"]
  };

  return places
    .map(place => {
      const distance = calculateDistance(
        userLat,
        userLng,
        place.lat,
        place.lng
      );

      if (distance > maxDist) return null;

      const timeFit = Math.max(0, 1 - distance / maxDist);
      const groupSuitability =
        groupPreferences[group]?.includes(place.category) ? 1 : 0.4;

      const score =
        0.6 * timeFit +
        0.4 * groupSuitability;

      const eta = estimateTravelTime(distance, transport);

      let reason = "Balanced nearby option";
      if (distance < 0.3) reason = "Extremely close";
      else if (groupSuitability === 1) reason = `Good for ${group}`;

      return {
        ...place,
        distance_km: Number(distance.toFixed(2)),
        eta_minutes: eta,
        score: Number(score.toFixed(2)),
        reason
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

/* =========================
   GEOCODING (CITY + AREA)
========================= */
async function geocode(city, area) {
  const q = `${area}, ${city}`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`;

  const res = await axios.get(url, {
    headers: { "User-Agent": "VibeGo-App" }
  });

  if (res.data.length === 0) return null;

  return {
    lat: parseFloat(res.data[0].lat),
    lng: parseFloat(res.data[0].lon)
  };
}

/* =========================
   FETCH PLACES API
========================= */
app.get("/api/places", async (req, res) => {
  try {
    const {
      city,
      area,
      group = "friends",
      time = "2",
      budget = "medium",
      transport = "car"
    } = req.query;

    if (!city || !area) {
      return res.status(400).json({ error: "city and area required" });
    }

    const coords = await geocode(city, area);
    if (!coords) return res.json([]);

    const maxDistMap = { 1: 1, 2: 2, 4: 4 };
    const maxDist = maxDistMap[time];

    const budgetMap = {
      low: ["fast_food"],
      medium: ["cafe", "fast_food"],
      high: ["restaurant", "cafe", "leisure"]
    };

    const allowedCategories = budgetMap[budget];

    const query = `
      [out:json];
      (
        node["amenity"~"restaurant|cafe|fast_food"](around:3000,${coords.lat},${coords.lng});
        node["leisure"](around:3000,${coords.lat},${coords.lng});
      );
      out body;
    `;

    const response = await axios.post(
      "https://overpass.kumi.systems/api/interpreter",
      query,
      { headers: { "Content-Type": "text/plain" } }
    );

    const cleaned = cleanPlaceData(response.data.elements)
      .filter(p => !sessionData.rejectedPlaceIds.includes(p.id))
      .filter(p => allowedCategories.includes(p.category));

    const ranked = rankPlaces(
      cleaned,
      coords.lat,
      coords.lng,
      group,
      maxDist,
      transport
    );

    res.json(ranked.slice(0, 5));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});

/* =========================
   REJECT API
========================= */
app.post("/api/reject", (req, res) => {
  const { placeId } = req.body;
  if (!placeId) return res.status(400).json({ error: "placeId required" });

  if (!sessionData.rejectedPlaceIds.includes(placeId)) {
    sessionData.rejectedPlaceIds.push(placeId);
  }

  res.json({ success: true });
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
