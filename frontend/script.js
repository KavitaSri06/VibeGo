const API_BASE = "http://localhost:5000";

async function fetchPlaces() {
  const city = cityInput();
  const area = areaInput();

  const group = groupInput();
  const time = timeInput();
  const budget = budgetInput();
  const transport = transportInput();

  document.getElementById("results").innerHTML =
    "<p>Loading recommendations...</p>";

  const res = await fetch(
    `${API_BASE}/api/places?city=${city}&area=${area}&group=${group}&time=${time}&budget=${budget}&transport=${transport}`
  );

  const data = await res.json();

  renderPlaces(data.results || []);
}

function renderPlaces(places) {
  const container = document.getElementById("results");
  container.innerHTML = "";

  places.forEach(place => {
    const div = document.createElement("div");
    div.className = "place" + (place.rank === 1 ? " top" : "");

    div.innerHTML = `
      <div class="card-header">
        <h3>${place.name}</h3>
        <span class="rank">#${place.rank}</span>
      </div>

      <div class="match-bar">
        <div class="match-fill" style="width:${place.match_percentage}%"></div>
      </div>
      <p class="match-text">${place.match_percentage}% Match</p>

      <p class="meta">${place.address}</p>
      <p class="reason">${place.reason}</p>

      <div class="info-row">
        <span>📍 ${place.distance_km} km</span>
        <span>⏱ ${place.eta_minutes} mins</span>
      </div>

      <button class="reject-btn" onclick="rejectPlace('${place.id}')">
        Reject
      </button>
    `;

    container.appendChild(div);
  });
}

async function rejectPlace(placeId) {
  await fetch(`${API_BASE}/api/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placeId })
  });

  fetchPlaces();
}

/* helpers */
const cityInput = () => document.getElementById("city").value;
const areaInput = () => document.getElementById("area").value;
const groupInput = () => document.getElementById("group").value;
const timeInput = () => document.getElementById("time").value;
const budgetInput = () => document.getElementById("budget").value;
const transportInput = () => document.getElementById("transport").value;
