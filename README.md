# js_laskettelu

# 🎿 JS-Laskettelu (SkiFree Clone)

A retro-style downhill skiing game built with **HTML5 Canvas** and **JavaScript**.  
Dodge trees and rocks, jump moguls for points, pass gates for extra score — and try to escape the **Yeti**!  
Features multiple **Autobot AI modes**, a customization menu, and a local leaderboard.

![Game Screenshot](screenshot.png) <!-- Replace with your actual screenshot -->

---

## 🎮 Features

- **Classic SkiFree-style gameplay**
- Obstacles: 🌲 Trees, 🪨 Rocks, 〰️ Moguls, 🚩 Gates
- **Yeti chase** after a set distance
- **Autobot AI** with 4 selectable algorithms:
  1. Survivalist – Avoid threats at all costs
  2. Greedy – Chases points, dodges last-second
  3. Cautious – Keeps centered, careful movement
  4. Simple Dodge – Always dodges left
- **Dev Mode** – Shows hitboxes, AI debug lines, lane highlights
- **Character selection** – Choose from ⛷️, 🏂, 🏃‍♂️, 🚴‍♀️, 🛹
- **Local leaderboard** stored in `localStorage`
- **High score tracking** across sessions

---

## ⌨️ Controls

**General Gameplay**
- `◀ / ▶` – Steer left/right
- `▼` – Go straight
- **Points:** Moguls (+100), Gates (+50)  
  **Penalty:** Hitting trees/rocks ends the game

**Special Modes**
- `B` – Toggle **Autobot AI**
- `D` – Toggle **Dev Mode**
- While Autobot is active:
  - `1–4` – Switch AI algorithm

**Menus**
- Mouse clicks for buttons
- `Press H` in game for help (if implemented in your build)

---

## 🧠 Autobot AI Modes

| Mode         | Behavior |
|--------------|----------|
| **Survivalist** | Prioritizes avoiding obstacles, chooses safest lane |
| **Greedy**     | Goes for points unless danger is near |
| **Cautious**   | Keeps to center, avoids threats early |
| **Simple Dodge** | Always dodges left when in danger |

---

## 📊 Leaderboard & High Score

- High scores are saved in your browser’s **`localStorage`**
- Leaderboard keeps **top 10 scores**
- Scores are updated **only in manual mode** (Autobot disabled)

---

## 🛠️ Customization

- Choose skier character in **Customize Menu**
- Selected character is saved for future sessions
- Characters include: ⛷️, 🏂, 🏃‍♂️, 🚴‍♀️, 🛹

---

## 📜 License

MIT License.  
Feel free to fork, modify, and share.

---

## 💡 Future Ideas

- 🎵 Add sound effects and background music  
- 🌍 Online multiplayer  
- 📱 Mobile touch support  
- 🐸 Add “AMIGAAA!” frog mode  

