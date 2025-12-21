const API_BASE = "http://localhost:5000";

async function fetchPlaces() {
  const city = document.getElementById("city").value;
const area = document.getElementById("area").value;
const transport = document.getElementById("transport").value;



const group = document.getElementById("group").value;
const time = document.getElementById("time").value;
const budget = document.getElementById("budget").value;


const maxDistMap = {
  1: 1,
  2: 2,
  4: 4
};

const maxDist = maxDistMap[time];

const res = await fetch(
  `${API_BASE}/api/places?city=${city}&area=${area}&group=${group}&time=${time}&budget=${budget}&transport=${transport}`
);



  const places = await res.json();
  renderPlaces(places);
}

function renderPlaces(places) {
  const container = document.getElementById("results");
  container.innerHTML = "";

  if (places.length === 0) {
    container.innerHTML = "<p>No places found.</p>";
    return;
  }

  places.forEach(place => {
    const div = document.createElement("div");
    div.className = "place";

    div.innerHTML = `
      <h3>${place.name}</h3>
      <p>${place.reason}</p>
      <p><strong>Distance:</strong> ${place.distance_km} km</p>
      <p><strong>Score:</strong> ${place.score}</p>
      <button class="reject-btn" onclick="rejectPlace(${place.id})">
        Reject ❌
      </button>
    `;

    container.appendChild(div);
  });
}

async function rejectPlace(placeId) {
  await fetch(`${API_BASE}/api/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ placeId })
  });

  fetchPlaces(); // refresh list
}
