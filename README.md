# 🚀 VibeGo – A Smart Engine to Decide Where to Go

VibeGo is a constraint-based decision engine that helps users decide **where to go for short outings**.  
Instead of listing hundreds of places, VibeGo focuses on **decision convergence** by ranking, explaining, and refining recommendations based on real-world constraints.

---

## 🧠 Problem Statement

Choosing where to go for a short outing is often harder than the outing itself.

Users face decision fatigue due to too many options, limited time and budget, varying group preferences, and repeated suggestions of already visited places. Most existing platforms focus on **place discovery**, not on helping users **arrive at a clear decision**.

---

## 💡 Solution Overview

VibeGo works as a **decision assistant**, not a discovery platform.

It:
- Accepts user constraints such as city, area, group type, time, budget, and transport
- Fetches nearby places using real-time map data
- Ranks places using a constraint-based scoring engine
- Displays only the **top-ranked recommendations**
- Allows users to reject options and dynamically re-ranks remaining places
- Guides the user toward a confident final choice

---

## 🖼️ UI Preview

![VibeGo UI](./assets/vibego-ui.png)

---

## ✨ Key Capabilities

- 🌍 City & area-based place selection  
- 🎯 Constraint-aware ranking (time, budget, group type, transport)  
- 🔁 Iterative rejection and re-ranking loop  
- 🧠 Explainable recommendations (why this place?)  
- 📊 Ranked output with match percentage  
- 🚕 Distance and ETA awareness  
- 🗺️ Real-time place data using OpenStreetMap  

---

## 🧩 How It Works

1. User provides constraints (location, group, time, budget, transport)
2. System fetches nearby places using OpenStreetMap APIs
3. Each place is scored based on distance feasibility, group suitability, and budget fit
4. Top-ranked places are presented with explanations
5. User rejection feedback updates the ranking dynamically
6. Process continues until decision convergence

---

## 🛠 Tech Stack

**Frontend**
- HTML
- CSS
- Vanilla JavaScript

**Backend**
- Node.js
- Express.js

**Data & APIs**
- OpenStreetMap (Overpass API)
- Nominatim (Geocoding & Reverse Geocoding)

---

## 👩‍💻 Author

Built by **Kavita Sri** with ❤️  
as a decision-focused, real-time recommendation system.
