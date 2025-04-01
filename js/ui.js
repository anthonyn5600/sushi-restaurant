// --- UI Update Functions & DOM References ---

// DOM Element References
const prepStationTitle = document.getElementById('prep-station-title');
const ingredientButtonsContainer = document.getElementById('ingredient-buttons');
const prepDisplay = document.getElementById('prep-display');
const finishPrepButton = document.getElementById('finish-prep-btn');
const clearPrepButton = document.getElementById('clear-prep-btn');
const scoreDisplay = document.getElementById('score');
const messageArea = document.getElementById('message-area');
const finishedDishDisplay = document.getElementById('finished-dish-display');
// const sushiBeltContainer = document.getElementById('sushi-belt-container'); // REMOVED
const gameArea = document.getElementById('game-area');
const tableArea = document.getElementById('table-area');
const customerOrdersContainer = document.getElementById('customer-orders-at-table');
const partyHungerMeterDisplay = document.getElementById('party-hunger-meter');
const currentOrdersDisplay = document.getElementById('current-orders-display');
const deliverFoodButton = document.getElementById('deliver-food-btn'); // ADDED

// --- UI Update Functions ---
function updateScoreDisplay() {
    scoreDisplay.textContent = score;
    // Also update mobile overlay if visible
    const mobileScore = document.getElementById('score-value-mobile');
    if (mobileScore) mobileScore.textContent = score;
}

function showMessage(text, type = "black") {
    const desktopMessageArea = document.getElementById('message-area');
    const mobileMessageArea = document.getElementById('message-area-mobile');

    if (desktopMessageArea) {
        desktopMessageArea.textContent = text;
        desktopMessageArea.className = 'message-area'; // Reset classes
        if (type === 'green') desktopMessageArea.classList.add('message-success');
        else if (type === 'red') desktopMessageArea.classList.add('message-error');
        else if (type === 'orange') desktopMessageArea.classList.add('message-warning');
        else if (type === 'blue') desktopMessageArea.classList.add('message-info');
    }
    if (mobileMessageArea) {
        mobileMessageArea.textContent = text;
        mobileMessageArea.className = 'mobile-only-message'; // Reset classes
        if (type === 'green') mobileMessageArea.classList.add('message-success');
        else if (type === 'red') mobileMessageArea.classList.add('message-error');
        else if (type === 'orange') mobileMessageArea.classList.add('message-warning');
        else if (type === 'blue') mobileMessageArea.classList.add('message-info');
    }
}

function updatePrepDisplay() {
    prepDisplay.textContent = currentPreparation.map(name => INGREDIENTS[name]).join(' ');
}

function addFinishedDishToDisplay(finishedDishData) {
    const dishVisual = document.createElement('span');
    dishVisual.classList.add('finished-dish-item');
    dishVisual.dataset.dishInstanceId = finishedDishData.id;

    let visualText = finishedDishData.recipe.visual;
    if (finishedDishData.recipe.ingredients.includes('rice') && !visualText.startsWith(INGREDIENTS['rice'])) {
        visualText = INGREDIENTS['rice'] + ' ' + visualText;
    }
    dishVisual.textContent = visualText;

    finishedDishDisplay.appendChild(dishVisual);
    updateDeliverButtonState(); // Update button state when a dish is added
}

function removeFinishedDishFromDisplay(dishInstanceId) {
    const dishElement = finishedDishDisplay.querySelector(`.finished-dish-item[data-dish-instance-id="${dishInstanceId}"]`);
    if (dishElement) {
        dishElement.remove();
        updateDeliverButtonState(); // Update button state when a dish is removed
    } else {
        console.warn(`Could not find dish element with ID ${dishInstanceId} to remove from display.`);
    }
}

function clearFinishedDishDisplay() {
    Array.from(finishedDishDisplay.children).forEach(child => child.remove());
    finishedDishDisplay.innerHTML = ''; // Clear completely
    updateDeliverButtonState(); // Update button state when queue is cleared
}

function updateHungerMeterDisplay() {
    if (currentParty && currentParty.targetSatisfaction > 0) {
        partyHungerMeterDisplay.textContent = `${currentParty.satisfaction} / ${currentParty.targetSatisfaction}`;
    } else {
        partyHungerMeterDisplay.textContent = `-- / --`;
    }
}

function updateCurrentOrdersDisplay() {
    currentOrdersDisplay.innerHTML = ''; // Clear previous orders

    if (!currentParty || !currentParty.members) {
        currentOrdersDisplay.innerHTML = '<p>No party at table...</p>';
        return;
    }

    const waitingCustomers = currentParty.members.filter(c => c.state === 'waiting' && c.order);

    if (waitingCustomers.length === 0) {
        currentOrdersDisplay.innerHTML = '<p>No orders waiting...</p>';
    } else {
        waitingCustomers.forEach(customer => {
            const orderDiv = document.createElement('div');
            orderDiv.classList.add('order-item');

            const customerSpan = document.createElement('span');
            customerSpan.classList.add('order-customer-id');
            customerSpan.textContent = `C${customer.seatNumber}:`; // "C1:", "C2:", etc.

            const nameSpan = document.createElement('span');
            nameSpan.classList.add('order-name');
            nameSpan.textContent = ` ${customer.order.name}`; // Add space

            const visualSpan = document.createElement('span');
            visualSpan.classList.add('order-visual');
            let displayContent = customer.order.visual;
            if (customer.order.ingredients.includes('rice') && !displayContent.startsWith(INGREDIENTS['rice'])) {
                 displayContent = INGREDIENTS['rice'] + displayContent; // No extra space needed if rice is first
            } else {
                 displayContent = ' ' + displayContent; // Add space before visual if no rice prefix
            }
            visualSpan.textContent = displayContent;

            orderDiv.appendChild(customerSpan);
            orderDiv.appendChild(nameSpan);
            orderDiv.appendChild(visualSpan);
            currentOrdersDisplay.appendChild(orderDiv);
        });
    }
}

function updateTableDisplay() {
    customerOrdersContainer.innerHTML = '';
    if (!currentParty || currentParty.members.length === 0) {
        customerOrdersContainer.innerHTML = '<p style="color: #888; font-size: 0.9em; width: 100%; text-align: center;">Table is empty...</p>';
        updateHungerMeterDisplay();
        updateCurrentOrdersDisplay(); // Also update waiting orders display
        return;
    }

    currentParty.members.forEach(customer => {
        const seatDiv = document.createElement('div');
        seatDiv.classList.add('customer-table-seat');
        seatDiv.dataset.customerId = customer.id;
        seatDiv.classList.add(`state-${customer.state}`);

        const labelH4 = document.createElement('h4');
        labelH4.classList.add('customer-seat-label');
        labelH4.textContent = `Customer ${customer.seatNumber}`;
        seatDiv.appendChild(labelH4);

        const statusDiv = document.createElement('div');
        statusDiv.classList.add('customer-status-display');
        seatDiv.appendChild(statusDiv);
        renderCustomerStatus(statusDiv, customer);

        customerOrdersContainer.appendChild(seatDiv);
    });

    updateHungerMeterDisplay();
    updateCurrentOrdersDisplay(); // Keep waiting orders sync'd
}

function updateCustomerSeatDisplay(customerId) {
    const seatDiv = customerOrdersContainer.querySelector(`.customer-table-seat[data-customer-id="${customerId}"]`);
    const customer = findCustomerById(customerId);

    if (seatDiv && customer) {
        const statusDiv = seatDiv.querySelector('.customer-status-display');
        if (statusDiv) {
             seatDiv.className = 'customer-table-seat'; // Base class
             seatDiv.classList.add(`state-${customer.state}`); // Add current state class
             renderCustomerStatus(statusDiv, customer);
        }
    }
    updateHungerMeterDisplay();
}

function renderCustomerStatus(statusDiv, customer) {
    statusDiv.innerHTML = ''; // Clear previous content
    switch (customer.state) {
        case 'pondering':
            const ponderText = document.createElement('span');
            ponderText.classList.add('pondering-text');
            ponderText.textContent = "Thinking...";
            statusDiv.appendChild(ponderText);
            break;
        case 'waiting':
             if (customer.order) {
                 const detailsDiv = document.createElement('div');
                 detailsDiv.classList.add('order-details');
                 const nameSpan = document.createElement('span');
                 nameSpan.classList.add('order-name');
                 nameSpan.textContent = customer.order.name;
                 detailsDiv.appendChild(nameSpan);
                 const visualSpan = document.createElement('span');
                 visualSpan.classList.add('order-visual');
                 let displayContent = customer.order.visual;
                 if (customer.order.ingredients.includes('rice') && !displayContent.startsWith(INGREDIENTS['rice'])) {
                     displayContent = INGREDIENTS['rice'] + ' ' + displayContent;
                 }
                 visualSpan.textContent = displayContent;
                 detailsDiv.appendChild(visualSpan);
                 statusDiv.appendChild(detailsDiv);
             } else { statusDiv.textContent = "?"; }
             break;
        case 'eating':
            if (customer.order) {
                const visualSpan = document.createElement('span');
                visualSpan.classList.add('order-visual');
                let displayContent = customer.order.visual;
                 if (customer.order.ingredients.includes('rice') && !displayContent.startsWith(INGREDIENTS['rice'])) {
                    displayContent = INGREDIENTS['rice'] + ' ' + displayContent;
                }
                visualSpan.textContent = displayContent;
                visualSpan.style.opacity = Math.max(0.1, 1 - (customer.eatingProgress / 100));
                statusDiv.appendChild(visualSpan);
            } else { statusDiv.textContent = "Eating (?)"; }
            break;
         case 'finished':
             const finishedText = document.createElement('span');
             finishedText.textContent = "✅ Satisfied!";
             statusDiv.appendChild(finishedText);
             break;
        default: statusDiv.textContent = "...";
    }
}

function createIngredientButtons() {
    ingredientButtonsContainer.innerHTML = ''; // Clear existing buttons
    for (const ingredientName in INGREDIENTS) {
        const button = document.createElement('button');
        button.classList.add('ingredient-btn');
        button.textContent = INGREDIENTS[ingredientName];
        button.dataset.ingredient = ingredientName;

        if (IS_MOBILE) {
            button.draggable = false; // Disable drag on mobile
            button.addEventListener('click', handleIngredientTap); // Add tap listener
        } else {
            button.draggable = true; // Ensure draggable on desktop
            button.addEventListener('dragstart', handleIngredientDragStart); // Add drag listener
        }

        ingredientButtonsContainer.appendChild(button);
    }
}

// --- Animation Function ---
function animateDishOrbit(dishVisualText, servedDishData) {
    const dishInstanceId = servedDishData.id;

    if (!gameArea || !tableArea || !dishVisualText || !servedDishData || !servedDishData.customerId) {
        console.error("Missing elements or data for orbit animation:", { dishVisualText, servedDishData });
        animatingDishIds.delete(dishInstanceId); // Clean up if animation can't start
        updateDeliverButtonState(); // Ensure button state is correct
        return;
    }

    if (document.querySelector(`.orbiting-dish[data-orbit-id="${dishInstanceId}"]`)) {
        console.warn(`Orbit animation already exists for dish ID: ${dishInstanceId}`);
        return;
    }

    const orbiter = document.createElement('div');
    orbiter.classList.add('orbiting-dish');
    orbiter.textContent = dishVisualText;
    orbiter.dataset.orbitId = dishInstanceId;
    document.body.appendChild(orbiter);

    const gameAreaRect = gameArea.getBoundingClientRect();
    const tableAreaRect = tableArea.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    const queueRect = finishedDishDisplay.getBoundingClientRect();
    const orbiterRect = orbiter.getBoundingClientRect();
    const offsetX = orbiterRect.width / 2;
    const offsetY = orbiterRect.height / 2;

    const startX = queueRect.left + queueRect.width / 2 + scrollX - offsetX;
    const startY = queueRect.top + queueRect.height / 2 + scrollY - offsetY;

    const path = {
        topLeft: { x: gameAreaRect.left + scrollX - offsetX + 30, y: gameAreaRect.top + scrollY - offsetY + 30 },
        topRight: { x: gameAreaRect.right + scrollX - offsetX - 30, y: gameAreaRect.top + scrollY - offsetY + 30 },
        bottomRight: { x: gameAreaRect.right + scrollX - offsetX - 30, y: gameAreaRect.bottom + scrollY - offsetY - 30 },
        bottomLeft: { x: gameAreaRect.left + scrollX - offsetX + 30, y: gameAreaRect.bottom + scrollY - offsetY - 30 },
    };
    const endX = tableAreaRect.left + scrollX + tableAreaRect.width / 2 - offsetX;
    const endY = tableAreaRect.top + scrollY + tableAreaRect.height / 2 - offsetY;

    orbiter.style.position = 'absolute';
    orbiter.style.top = `${startY}px`;
    orbiter.style.left = `${startX}px`;
    orbiter.style.opacity = '0';

    const keyframes = [
        { transform: `translate(0, 0) scale(0.8)`, opacity: 0, offset: 0 },
        { transform: `translate(0, 0) scale(1)`, opacity: 1, offset: 0.05 },
        { transform: `translate(${path.topLeft.x - startX}px, ${path.topLeft.y - startY}px) scale(1.1)`, opacity: 1, offset: 0.25 },
        { transform: `translate(${path.topRight.x - startX}px, ${path.topRight.y - startY}px) scale(1)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${path.bottomRight.x - startX}px, ${path.bottomRight.y - startY}px) scale(0.9)`, opacity: 1, offset: 0.75 },
        { transform: `translate(${endX - startX}px, ${endY - startY}px) scale(0.5)`, opacity: 0, offset: 1 }
    ];
    const options = { duration: 3000, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' };
    let fallbackTimeout;

    const cleanupOrbiter = (reason = "unknown") => {
         if (animatingDishIds.has(dishInstanceId)) {
             animatingDishIds.delete(dishInstanceId);
             updateDeliverButtonState(); // UPDATE BUTTON STATE
         }
         if (orbiter.parentNode) orbiter.parentNode.removeChild(orbiter);
         clearTimeout(fallbackTimeout);
    };

    const handleServeSuccess = () => {
        const customer = findCustomerById(servedDishData.customerId);
        if (customer && customer.state === 'waiting') {
             score += 10;
             updateScoreDisplay();
             showMessage(`Delivered ${servedDishData.recipe.name} to Customer ${customer.seatNumber}! (+10)`, "green");
             startEating(servedDishData.customerId);
        } else {
            console.warn(`Customer ${servedDishData.customerId} not found or not in 'waiting' state (state: ${customer?.state}) during delivery completion.`);
            showMessage(`Customer ${customer?.seatNumber || servedDishData.customerId} missed the delivery!`, "orange");
        }
        cleanupOrbiter("onfinish");
    };

    const animation = orbiter.animate(keyframes, options);
    animation.onfinish = handleServeSuccess;
    animation.oncancel = () => cleanupOrbiter("oncancel");
    fallbackTimeout = setTimeout(() => cleanupOrbiter("fallback"), options.duration + 500);
    updateDeliverButtonState(); // Update button state immediately after starting animation
}

// --- Mobile Ingredient Tap Handler ---
function handleIngredientTap(event) {
    const isCustomerWaiting = currentParty && currentParty.members.some(c => c.state === 'waiting');
     if (!isCustomerWaiting) {
         let reason = "No party members waiting for orders";
         if (currentParty && currentParty.members.length > 0) reason = "Party members are thinking, eating, or finished";
         if (!currentParty) reason = "No party at the table";
        showMessage(`${reason}!`, "orange");
        return;
    }
    const ingredientName = event.target.dataset.ingredient;
    if (ingredientName && INGREDIENTS[ingredientName]) {
        currentPreparation.push(ingredientName);
        updatePrepDisplay();
    } else {
        console.warn("Ingredient tap event occurred, but no valid ingredient data found.");
    }
}

// --- NEW: Deliver Button Handler ---
function handleDeliverFoodClick() {
    if (finishedDishes.length === 0) {
        showMessage("No dishes ready to deliver!", "orange");
        return;
    }
    const nextDishToServe = finishedDishes[0];
    if (animatingDishIds.has(nextDishToServe.id)) {
        showMessage("The next dish is already being served!", "orange");
        return;
    }

    // --- Critical Order ---
    animatingDishIds.add(nextDishToServe.id);
    const servedDishData = finishedDishes.shift();
    const dishVisualElement = finishedDishDisplay.querySelector(`.finished-dish-item[data-dish-instance-id="${servedDishData.id}"]`);
    const servedDishVisualText = dishVisualElement ? dishVisualElement.textContent : '?';
    removeFinishedDishFromDisplay(servedDishData.id); // Also calls updateDeliverButtonState
    // --- End Critical Order ---

    showMessage(`Serving ${servedDishData.recipe.name}...`, "blue");
    animateDishOrbit(servedDishVisualText, servedDishData);
    updateDeliverButtonState(); // Update state after potential changes
}

// --- NEW: Function to manage button state ---
function updateDeliverButtonState() {
    if (finishedDishes.length === 0) {
        deliverFoodButton.disabled = true;
    } else {
        const nextDishId = finishedDishes[0].id;
        deliverFoodButton.disabled = animatingDishIds.has(nextDishId);
    }
}

// --- Desktop Ingredient Drag and Drop Handlers ---
function handleIngredientDragStart(event) {
    if (IS_MOBILE) { event.preventDefault(); return; }
    const isCustomerWaiting = currentParty && currentParty.members.some(c => c.state === 'waiting');
    if (!isCustomerWaiting) {
         let reason = "No party members waiting for orders";
         if (currentParty && currentParty.members.length > 0) reason = "Party members are thinking, eating, or finished";
         if (!currentParty) reason = "No party at the table";
        showMessage(`${reason}!`, "orange");
        event.preventDefault();
        return;
    }
    const ingredientName = event.target.dataset.ingredient;
    event.dataTransfer.setData('text/plain', ingredientName);
    event.dataTransfer.effectAllowed = 'copy';
}

function handleIngredientDragOver(event) {
    if (IS_MOBILE) return;
    event.preventDefault();
    if (event.dataTransfer.types.includes('text/plain')) {
        event.dataTransfer.dropEffect = 'copy';
    } else {
        event.dataTransfer.dropEffect = 'none';
    }
}

function handleIngredientDragEnter(event) {
     if (IS_MOBILE) return;
     event.preventDefault();
     if (event.target === prepDisplay && event.dataTransfer.types.includes('text/plain')) {
       prepDisplay.classList.add('drag-over');
     }
}

function handleIngredientDragLeave(event) {
     if (IS_MOBILE) return;
     event.preventDefault();
      try {
          if (event.target === prepDisplay && !prepDisplay.contains(event.relatedTarget)) {
             prepDisplay.classList.remove('drag-over');
          }
      } catch(e) {
          prepDisplay.classList.remove('drag-over');
      }
}

function handleIngredientDrop(event) {
    if (IS_MOBILE) return;
    event.preventDefault();
    prepDisplay.classList.remove('drag-over');
    const isCustomerWaiting = currentParty && currentParty.members.some(c => c.state === 'waiting');
    if (!isCustomerWaiting) { showMessage("No party members waiting for an order!", "orange"); return; }
    const ingredientName = event.dataTransfer.getData('text/plain');
    if (ingredientName && INGREDIENTS[ingredientName]) {
        currentPreparation.push(ingredientName);
        updatePrepDisplay();
    } else {
        console.warn("Ingredient drop event occurred, but no valid ingredient data found.");
        showMessage("Could not add ingredient from drop.", "orange");
    }
}