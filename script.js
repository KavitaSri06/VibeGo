import places from "./data/places.js";

const MIN_ACCEPTABLE_SCORE = 40;

// DOM elements
const form = document.getElementById("decisionForm");
const resultsDiv = document.getElementById("results");

/* =========================
   SCORING LOGIC
========================= */

function calculateScore(place, user) {
  let score = 0;

  let breakdown = {
    area: 0,
    group: 0,
    budget: 0,
    time: 0,
    mood: 0
  };

  // Area proximity (15)
  if (place.area.toLowerCase() === user.area.toLowerCase()) {
    breakdown.area = 15;
    score += 15;
  } else if (
    place.nearbyAreas &&
    place.nearbyAreas.map(a => a.toLowerCase()).includes(user.area.toLowerCase())
  ) {
    breakdown.area = 8;
    score += 8;
  }

  // Group match (30)
  if (place.groupTypes.includes(user.groupType)) {
    breakdown.group = 30;
    score += 30;
  }

  // Budget match (25)
  if (place.budget === user.budget) {
    breakdown.budget = 25;
    score += 25;
  }

  // Time match (25)
  if (place.time.includes(user.time)) {
    breakdown.time = 25;
    score += 25;
  }

  // Mood match (20) – partial scoring
  const moodMatches = place.moods.filter(m =>
    user.moods.includes(m)
  );

  if (moodMatches.length === 1) {
    breakdown.mood = 10;
    score += 10;
  } else if (moodMatches.length >= 2) {
    breakdown.mood = 20;
    score += 20;
  }

  return {
    ...place,
    score,
    breakdown
  };
}

/* =========================
   EXPLANATION LOGIC
========================= */

function generateExplanation(placeResult) {
  const reasons = [];

  if (placeResult.breakdown.area === 15)
    reasons.push("very close to your selected area");

  if (placeResult.breakdown.area === 8)
    reasons.push("reasonably close to your selected area");

  if (placeResult.breakdown.group > 0)
    reasons.push("suitable for your group type");

  if (placeResult.breakdown.budget > 0)
    reasons.push("fits your budget range");

  if (placeResult.breakdown.time > 0)
    reasons.push("matches your available time");

  if (placeResult.breakdown.mood > 0)
    reasons.push("matches some of your mood preferences");

  if (reasons.length === 0) {
    return "Closest available option based on limited matching factors";
  }

  return reasons.join(", ");
}

/* =========================
   MAIN DSS RUNNER
========================= */

function runDecisionSystem(userInput) {
  resultsDiv.innerHTML = "";

  const scoredPlaces = places.map(place => {
    const result = calculateScore(place, userInput);
    return {
      ...result,
      explanation: generateExplanation(result)
    };
  });

  const rankedPlaces = scoredPlaces
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const hasGoodMatches = rankedPlaces.some(
    place => place.score >= MIN_ACCEPTABLE_SCORE
  );

  if (!hasGoodMatches) {
    resultsDiv.innerHTML =
      "<p><em>No perfect matches found. Showing closest possible options.</em></p>";
  }

  rankedPlaces.forEach((place, index) => {
    const card = document.createElement("div");

    card.innerHTML = `
      <h3>#${index + 1} ${place.name}</h3>
      <p><strong>Score:</strong> ${place.score}/100</p>
      <p><strong>Why:</strong> ${place.explanation}</p>
      <p><strong>Highlight:</strong> ${place.highlight}</p>
      <hr>
    `;

    resultsDiv.appendChild(card);
  });
}

/* =========================
   FORM HANDLER
========================= */

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const userInput = {
    area: document.getElementById("area").value.trim(),
    groupType: document.getElementById("groupType").value,
    budget: document.getElementById("budget").value,
    time: document.getElementById("time").value,
    moods: Array.from(
      document.querySelectorAll(".mood:checked")
    ).map(cb => cb.value)
  };

  runDecisionSystem(userInput);
});
