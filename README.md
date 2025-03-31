# 🍣 Sushi Restaurant! 🍣

A fast-paced, drag-and-drop web game where you run a sushi prep station, fulfilling customer orders as quickly as possible! Prepare dishes, manage a queue, and serve entire parties before they get impatient.

## ✨ Live Demo ✨

[Play Sushi Sprint! Live Here!](https://anthonyn5600.github.io/sushi-restaurant/)

## 🎮 How to Play

1.  **Customers Arrive:** Parties of customers will arrive and take seats at the table.
2.  **Pondering:** Customers will think for a moment before deciding on their order.
3.  **Check Orders:** Once decided, their order appears in the "Waiting Orders" list above the ingredients and visually on their seat.
4.  **Prepare Dish:** Drag the required ingredient emojis (🍚 Rice, 📗 Nori, 🍣 Salmon, etc.) from the buttons into the "Preparing:" area.
5.  **Finish Prep:** When the ingredients in the "Preparing" area match a waiting customer's order, click the "Finish Prep" button.
6.  **Dish Queue:** The correctly prepared dish will appear in the "Ready Dishes Queue". You can prepare multiple dishes and queue them up.
7.  **Serve:** Drag a finished dish from the "Ready Dishes Queue" onto the "Drop Dish Here to Serve" conveyor belt area.
8.  **Delivery:** Watch the dish animate to the correct customer!
9.  **Eating:** The customer will take some time to eat their sushi.
10. **Party Satisfaction:** Serve all members of the party correctly to make them leave satisfied. Your score increases!
11. **Mistakes:** Preparing the wrong ingredients or taking too long might affect your score.
12. **Next Party:** Once a party leaves, the next one will arrive shortly. Keep up the pace!

---

## ⭐ Features

*   **Party System:** Customers arrive and leave in groups (parties).
*   **Order Display:** Clear list of currently waiting orders in the prep station.
*   **Visual Customer Status:** Customers show states like Pondering, Waiting (with order), Eating, and Finished.
*   **Drag & Drop Interface:** Intuitive interaction for adding ingredients and serving dishes.
*   **Preparation Queue:** Ability to prepare multiple dishes ahead of serving.
*   **Conveyor Belt Serving:** Dishes are "sent" via a drop zone, triggering an animation.
*   **Serving Animation:** Simple visual feedback for dish delivery (using Web Animations API).
*   **Scoring System:** Earn points for successful servings.
*   **Responsive Layout:** Adapts to different screen sizes (using CSS Flexbox and Media Queries).

---

## 🛠️ Technologies Used

*   **HTML5:** Structure of the game interface.
*   **CSS3:** Styling, layout (Flexbox), animations (transitions, keyframes), and responsive design.
*   **Vanilla JavaScript (ES6+):** Core game logic, state management, DOM manipulation, event handling.
*   **HTML Drag and Drop API:** For moving ingredients and dishes.
*   **Web Animations API:** For the orbiting dish animation.

---

## 🚀 Running Locally

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/<your-username>/<your-repository-name>.git
    ```
2.  **Navigate to the directory:**
    ```bash
    cd <your-repository-name>
    ```
3.  **Open `index.html`:** Simply open the `index.html` file directly in your web browser. No build step or local server is required for this project.

---

## 📄 License

This project is open source and available under the [MIT License](https://opensource.org/licenses/MIT). Feel free to use, modify, and distribute the code.