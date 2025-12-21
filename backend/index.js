const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;

/* =========================
   IN-MEMORY SESSION (MVP)
========================= */
let sessionData = {
  rejectedPlaceIds: []
};

/* =========================
   TEST ROUTE
========================= */
app.get("/", (req, res) => {
  res.send("VibeGo backend running with OpenStreetMap 🚀");
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
   DISTANCE CALCULATION
========================= */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/* =========================
   RANKING ENGINE (FINAL)
========================= */
function rankPlaces(places, userLat, userLng, group, maxDist) {
  return places
    .map(place => {
      const distance = calculateDistance(
        userLat,
        userLng,
        place.lat,
        place.lng
      );

      // HARD DISTANCE FILTER
      if (distance > maxDist) return null;

      /* ---- Continuous Distance Score ---- */
      const timeFit = Math.max(0, 1 - distance / maxDist);

      /* ---- Group Suitability ---- */
      let groupSuitability = 0.4;
      if (group === "friends") {
        const friendCategories = ["restaurant", "cafe", "fast_food", "leisure"];
        if (friendCategories.includes(place.category)) {
          groupSuitability = 1;
        }
      }

      /* ---- Category Bonus (Tie-breaker) ---- */
      let categoryBonus = 0.05;
      if (group === "friends") {
        if (place.category === "cafe") categoryBonus = 0.15;
        else if (place.category === "restaurant") categoryBonus = 0.1;
      }

      /* ---- Final Score ---- */
      const finalScore =
        0.5 * timeFit +
        0.3 * groupSuitability +
        0.2 * categoryBonus;

      /* ---- Reason Generation ---- */
      let reason = "Balanced option nearby";
      if (distance < 0.3) {
        reason = `Extremely close (${distance.toFixed(1)} km away)`;
      } else if (categoryBonus >= 0.15) {
        reason = `Popular choice for ${group} hangout`;
      } else if (groupSuitability === 1) {
        reason = `Good match for ${group} outing`;
      }

      return {
        ...place,
        distance_km: Number(distance.toFixed(2)),
        score: Number(finalScore.toFixed(2)),
        reason
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

/* =========================
   FETCH PLACES API
========================= */
app.get("/api/places", async (req, res) => {
  try {
    const {
      lat,
      lng,
      radius = 1000,
      group = "friends",
      maxDist = 2
    } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: "lat and lng are required" });
    }

    const query = `
      [out:json];
      (
        node["amenity"~"restaurant|cafe|fast_food|bar"](around:${radius},${lat},${lng});
        node["leisure"](around:${radius},${lat},${lng});
        node["tourism"](around:${radius},${lat},${lng});
      );
      out body;
    `;

    const response = await axios.post(
      "https://overpass.kumi.systems/api/interpreter",
      query,
      {
        headers: { "Content-Type": "text/plain" },
        timeout: 20000
      }
    );

    const cleaned = cleanPlaceData(response.data.elements)
      .filter(p => !sessionData.rejectedPlaceIds.includes(p.id));

    if (cleaned.length === 0) return res.json([]);

    const ranked = rankPlaces(
      cleaned,
      parseFloat(lat),
      parseFloat(lng),
      group,
      parseFloat(maxDist)
    );

    res.json(ranked.slice(0, 5));
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to fetch places from OSM" });
  }
});

/* =========================
   REJECTION API
========================= */
app.post("/api/reject", (req, res) => {
  const { placeId } = req.body;

  if (!placeId) {
    return res.status(400).json({ error: "placeId is required" });
  }

  if (!sessionData.rejectedPlaceIds.includes(placeId)) {
    sessionData.rejectedPlaceIds.push(placeId);
  }

  res.json({
    message: "Place rejected successfully",
    rejectedPlaceIds: sessionData.rejectedPlaceIds
  });
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
