# VibeGo 🚀

VibeGo is an intelligent, constraint-based outing decision engine designed to reduce decision fatigue while planning short outings.  
Instead of listing hundreds of places, VibeGo helps users **converge on the best possible choice** through iterative ranking and rejection feedback.

---

## 🔍 Problem Statement

When planning short outings (with friends, family, or colleagues), users often struggle to decide where to go due to:
- Too many available options
- Limited budget and time
- Different group preferences
- Repetition of already visited places

Existing platforms focus on **discovery**, not **decision-making**, leading to confusion and wasted time.

---

## 💡 Solution Overview

VibeGo acts as a **decision assistant**, not a discovery tool.

It:
- Dynamically fetches nearby places using map/location APIs
- Ranks places based on constraints like budget, time, group type, and distance
- Presents only the **top N recommendations**
- Allows users to reject options (e.g., already visited, not interested)
- Re-ranks and refines results iteratively until the best option is selected

---

## ✨ Key Features (Planned)

- 🌍 City & locality-based place selection
- 🎯 Constraint-based ranking (budget, time, group type)
- 🔁 Iterative rejection and re-ranking loop (core USP)
- 🧠 Explainable recommendations (why this place?)
- 🚕 Transport feasibility & travel-time awareness
- 🔌 Real-time data via external APIs (Google Places / OpenStreetMap)

---

## 🧱 System Architecture (High Level)

1. User inputs constraints (location, budget, time, group)
2. System fetches nearby places via external APIs
3. Custom ranking engine scores each place
4. Top-N results are shown
5. User rejection feedback updates ranking dynamically
6. Process repeats until decision convergence

---

## 🛠 Tech Stack (Initial)

- Frontend: Web (HTML/CSS/JavaScript → React later)
- Backend: Node.js (planned)
- Data Source: Google Places API / OpenStreetMap
- Core Logic: Rule-based + weighted ranking engine

---



## 📌 Disclaimer

VibeGo is a portfolio and product-experiment project.  
Current implementation will focus on demonstrating core decision intelligence rather than full-scale commercial deployment.

---

## 👤 Author

Built by Kavita Sr as a product-driven engineering experiment.
