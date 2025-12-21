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
const addressCache = new Map();

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
      lng: el.lon,
      opening_hours: parseOpeningHours(el.tags),
      popular_items: popularItemsByCategory(
        el.tags.amenity || el.tags.leisure || el.tags.tourism
      )
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

async function reverseGeocode(lat, lng) {
  const key = `${lat},${lng}`;
  if (addressCache.has(key)) {
    return addressCache.get(key);
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

  try {
    const res = await axios.get(url, {
      headers: { "User-Agent": "VibeGo-App" }
    });

    const addr = res.data.address || {};

    const readable = [
      addr.road,
      addr.suburb || addr.neighbourhood,
      addr.city || addr.town || addr.village
    ].filter(Boolean).join(", ");

    addressCache.set(key, readable || "Address not available");
    return readable || "Address not available";
  } catch {
    return "Address not available";
  }
}


function parseOpeningHours(tags) {
  if (!tags || !tags.opening_hours) return "Hours not available";
  return tags.opening_hours;
}

function popularItemsByCategory(category) {
  const map = {
    cafe: ["Coffee", "Sandwich", "Pastry"],
    restaurant: ["Meals", "Dosa", "Biryani"],
    fast_food: ["Burgers", "Fried snacks"],
    leisure: ["Snacks", "Drinks"]
  };
  return map[category] || [];
}

function checkConvergence(places, rejectedCount) {
  if (places.length === 0) return null;

  const top = places[0];
  const second = places[1];

  // Rule 1: Dominant winner
  if (
    top.match_percentage >= 80 &&
    second &&
    top.match_percentage - second.match_percentage >= 15
  ) {
    return {
      converged: true,
      message: "This place strongly matches your preferences. You can confidently choose this."
    };
  }

  // Rule 2: Rejection fatigue
  if (rejectedCount >= 3 && places.length <= 2) {
    return {
      converged: true,
      message: "Based on your rejections, this is the best remaining option."
    };
  }

  return { converged: false };
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
      .filter(p => !sessionData.rejectedPlaceIds.includes(String(p.id)))

      .filter(p => allowedCategories.includes(p.category));

    const ranked = rankPlaces(
      cleaned,
      coords.lat,
      coords.lng,
      group,
      maxDist,
      transport
    );

   const topFive = ranked.slice(0, 5);

await Promise.all(
  topFive.map(async (place) => {
    place.address = await reverseGeocode(place.lat, place.lng);
  })
);


const finalResponse = topFive.map((place, index) => ({
  ...place,
  rank: index + 1,
  match_percentage: Math.round(place.score * 100),
  status: place.opening_hours,
  popular_items: place.popular_items.length
    ? place.popular_items
    : ["Items info not available"]
}));

const convergence = checkConvergence(
  finalResponse,
  sessionData.rejectedPlaceIds.length
);


res.json({
  converged: convergence.converged,
  message: convergence.message || null,
  results: finalResponse
});



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

  const normalizedId = String(placeId);

  if (!sessionData.rejectedPlaceIds.includes(normalizedId)) {
    sessionData.rejectedPlaceIds.push(normalizedId);
  }

  res.json({ success: true });
});


/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
