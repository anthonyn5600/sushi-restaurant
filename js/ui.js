// --- UI Update Functions & DOM References ---

// DOM Element References (no changes here)
const prepStationTitle = document.getElementById('prep-station-title');
const ingredientButtonsContainer = document.getElementById('ingredient-buttons');
const prepDisplay = document.getElementById('prep-display');
const finishPrepButton = document.getElementById('finish-prep-btn');
const clearPrepButton = document.getElementById('clear-prep-btn');
const scoreDisplay = document.getElementById('score');
const messageArea = document.getElementById('message-area');
const finishedDishDisplay = document.getElementById('finished-dish-display');
const sushiBeltContainer = document.getElementById('sushi-belt-container');
const gameArea = document.getElementById('game-area');
const tableArea = document.getElementById('table-area');
const customerOrdersContainer = document.getElementById('customer-orders-at-table');
const partyHungerMeterDisplay = document.getElementById('party-hunger-meter');
const currentOrdersDisplay = document.getElementById('current-orders-display');

// --- UI Update Functions --- (updateScoreDisplay, showMessage, updatePrepDisplay, addFinishedDishToDisplay, removeFinishedDishFromDisplay, clearFinishedDishDisplay, updateHungerMeterDisplay, updateCurrentOrdersDisplay, updateTableDisplay, updateCustomerSeatDisplay, renderCustomerStatus, createIngredientButtons - no changes needed in these)
// ... (keep existing functions as they were in the previous step) ...
function updateScoreDisplay() {
    scoreDisplay.textContent = score;
}

function showMessage(text, type = "black") {
    messageArea.textContent = text;
    messageArea.className = 'message-area'; // Reset classes
    messageArea.style.color = ''; // Clear inline color

    if (type === 'green') messageArea.classList.add('message-success');
    else if (type === 'red') messageArea.classList.add('message-error');
    else if (type === 'orange') messageArea.classList.add('message-warning');
    else if (type === 'blue') messageArea.classList.add('message-info');

     let colorValue = '#333';
     if(type === 'green') colorValue = '#1B5E20';
     else if(type === 'red') colorValue = '#B71C1C';
     else if(type === 'orange') colorValue = '#E65100';
     else if(type === 'blue') colorValue = '#0D47A1';
     messageArea.style.color = colorValue;
}

function updatePrepDisplay() {
    prepDisplay.textContent = currentPreparation.map(name => INGREDIENTS[name]).join(' ');
}

function addFinishedDishToDisplay(finishedDishData) {
    // finishedDishData = { id: uniqueInstanceId, recipe: {...}, customerId: ... }
    const dishVisual = document.createElement('span');
    dishVisual.classList.add('finished-dish-item');
    dishVisual.dataset.dishInstanceId = finishedDishData.id; // Store the unique ID

    let visualText = finishedDishData.recipe.visual;
    if (finishedDishData.recipe.ingredients.includes('rice') && !visualText.startsWith(INGREDIENTS['rice'])) {
        visualText = INGREDIENTS['rice'] + ' ' + visualText;
    }
    dishVisual.textContent = visualText;
    dishVisual.draggable = true;
    dishVisual.addEventListener('dragstart', handleDishDragStart);

    finishedDishDisplay.appendChild(dishVisual);
}

function removeFinishedDishFromDisplay(dishInstanceId) {
    const dishElement = finishedDishDisplay.querySelector(`.finished-dish-item[data-dish-instance-id="${dishInstanceId}"]`);
    if (dishElement) {
        dishElement.remove();
    } else {
        console.warn(`Could not find dish element with ID ${dishInstanceId} to remove from display.`);
    }
}

function clearFinishedDishDisplay() {
    finishedDishDisplay.innerHTML = '';
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
        if (customer.state === 'eating') seatDiv.classList.add('state-eating');
        if (customer.state === 'finished') seatDiv.classList.add('state-finished');

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
             seatDiv.className = 'customer-table-seat';
             seatDiv.classList.add(`state-${customer.state}`);
             if (customer.state === 'eating') seatDiv.classList.add('state-eating');
             if (customer.state === 'finished') seatDiv.classList.add('state-finished');
             renderCustomerStatus(statusDiv, customer);
        }
    }
    updateHungerMeterDisplay();
    // No need to call updateCurrentOrdersDisplay here, called by state change functions
}

function renderCustomerStatus(statusDiv, customer) {
    statusDiv.innerHTML = '';

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
                visualSpan.style.opacity = Math.max(0, 1 - (customer.eatingProgress / 100));
                statusDiv.appendChild(visualSpan);
            } else { statusDiv.textContent = "Eating (?)"; }
            break;
         case 'finished':
             const finishedText = document.createElement('span');
             finishedText.textContent = "✅ Satisfied!";
             finishedText.style.color = 'green';
             finishedText.style.fontWeight = 'bold';
             statusDiv.appendChild(finishedText);
             break;
        default: statusDiv.textContent = "...";
    }
}

function createIngredientButtons() {
    ingredientButtonsContainer.innerHTML = '';
    for (const ingredientName in INGREDIENTS) {
        const button = document.createElement('button');
        button.classList.add('ingredient-btn');
        button.textContent = INGREDIENTS[ingredientName];
        button.dataset.ingredient = ingredientName;
        button.draggable = true;
        button.addEventListener('dragstart', handleIngredientDragStart);
        ingredientButtonsContainer.appendChild(button);
    }
}


// --- Animation Function ---
// UPDATED: Remove ID from animatingDishIds Set on completion/cleanup
function animateDishOrbit(dishVisualText, servedDishData) {
    // servedDishData = { id: uniqueInstanceId, recipe: {...}, customerId: ... }
    const dishInstanceId = servedDishData.id; // Get the ID for cleanup

    if (!gameArea || !tableArea || !dishVisualText || !servedDishData || !servedDishData.customerId) {
        console.error("Missing elements or data for orbit animation.");
        // If animation fails to start, remove from tracking
        animatingDishIds.delete(dishInstanceId);
        return;
    }

    const orbiter = document.createElement('div');
    orbiter.classList.add('orbiting-dish');
    orbiter.textContent = dishVisualText;
    document.body.appendChild(orbiter);

    // ... [rest of the positioning and keyframe setup remains the same] ...
    const gameAreaRect = gameArea.getBoundingClientRect();
    const tableAreaRect = tableArea.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    const orbiterRect = orbiter.getBoundingClientRect();
    const offsetX = orbiterRect.width / 2;
    const offsetY = orbiterRect.height / 2;

    const startX = gameAreaRect.left + gameAreaRect.width / 2 + scrollX - offsetX;
    const startY = gameAreaRect.bottom + scrollY - offsetY - 10;

    const path = {
        topLeft: { x: gameAreaRect.left + scrollX - offsetX + 20, y: gameAreaRect.top + scrollY - offsetY + 20 },
        topRight: { x: gameAreaRect.right + scrollX - offsetX - 20, y: gameAreaRect.top + scrollY - offsetY + 20 },
        bottomRight: { x: gameAreaRect.right + scrollX - offsetX - 20, y: gameAreaRect.bottom + scrollY - offsetY - 20 },
    };

    const endX = tableAreaRect.left + scrollX + tableAreaRect.width / 2 - offsetX;
    const endY = tableAreaRect.top + scrollY + tableAreaRect.height / 2 - offsetY;

    orbiter.style.position = 'absolute';
    orbiter.style.top = `${startY}px`;
    orbiter.style.left = `${startX}px`;

    const keyframes = [
        { transform: `translate(0, 0)`, offset: 0 },
        { transform: `translate(${path.topLeft.x - startX}px, ${path.topLeft.y - startY}px)`, offset: 0.25 },
        { transform: `translate(${path.topRight.x - startX}px, ${path.topRight.y - startY}px)`, offset: 0.5 },
        { transform: `translate(${path.bottomRight.x - startX}px, ${path.bottomRight.y - startY}px)`, offset: 0.75 },
        { transform: `translate(${endX - startX}px, ${endY - startY}px)`, offset: 1 }
    ];

    const options = { duration: 3000, easing: 'ease-in-out' };

    // --- Animation Completion Handlers ---
    let fallbackTimeout;

    const handleServeSuccess = () => {
        clearTimeout(fallbackTimeout); // Clear fallback
        animatingDishIds.delete(dishInstanceId); // << REMOVE ID FROM SET
        const customer = findCustomerById(servedDishData.customerId);
        if (customer && customer.state === 'waiting') {
             score += 10;
             updateScoreDisplay();
             showMessage(`Delivered ${servedDishData.recipe.name} to Customer ${customer.seatNumber}! (+10)`, "green");
             startEating(servedDishData.customerId);
        } else {
            console.warn(`Customer ${servedDishData.customerId} not found or not in 'waiting' state during delivery completion.`);
            showMessage(`Customer ${customer?.seatNumber || servedDishData.customerId} missed the delivery!`, "orange");
        }
        if (orbiter.parentNode) orbiter.parentNode.removeChild(orbiter); // Clean up element
        // No need to set global isAnimating flag
    };

    const cleanupOrbiter = () => {
         // Only remove from set if it's still considered animating (prevents double removal if onfinish also fires)
        if (animatingDishIds.has(dishInstanceId)) {
             console.warn(`Orbiter animation for ${dishInstanceId} cleaned up via fallback timeout.`);
             animatingDishIds.delete(dishInstanceId); // << REMOVE ID FROM SET
         }
        if (orbiter.parentNode) orbiter.parentNode.removeChild(orbiter); // Clean up element
        clearTimeout(fallbackTimeout); // Clear self
    };

    // --- Start Animation ---
    const animation = orbiter.animate(keyframes, options);
    animation.onfinish = handleServeSuccess;
    // Pass the ID to the fallback cleanup context if needed, or rely on closure
    fallbackTimeout = setTimeout(cleanupOrbiter, options.duration + 200);
}


// --- Drag and Drop Handlers ---

// UPDATED: Ingredient D&D (Removed isAnimating check)
function handleIngredientDragStart(event) {
    const isCustomerWaiting = currentParty && currentParty.members.some(c => c.state === 'waiting');
    if (!isCustomerWaiting) { // Only check if someone is waiting
         let reason = "No party members waiting for orders";
         if (currentParty && currentParty.members.length > 0) reason = "Party members are thinking, eating, or finished";
         if (!currentParty) reason = "No party at the table";
        showMessage(`${reason}!`, "orange");
        event.preventDefault();
        return;
    }
    // Drag allowed
    const ingredientName = event.target.dataset.ingredient;
    event.dataTransfer.setData('text/plain', ingredientName);
    event.dataTransfer.effectAllowed = 'copy';
}

// UPDATED: Ingredient D&D (Removed isAnimating check)
function handleIngredientDragOver(event) {
    event.preventDefault();
    // Always allow drop effect over prep area if dragging ingredient
    event.dataTransfer.dropEffect = 'copy';
}

// UPDATED: Ingredient D&D (Removed isAnimating check)
function handleIngredientDragEnter(event) {
    event.preventDefault();
    // Always add visual feedback over prep area
    if (event.target === prepDisplay) {
       prepDisplay.classList.add('drag-over');
    }
}

// Ingredient D&D (No changes needed)
function handleIngredientDragLeave(event) {
     event.preventDefault();
     if (event.target === prepDisplay) {
        prepDisplay.classList.remove('drag-over');
     }
}

// UPDATED: Ingredient D&D (Removed isAnimating check)
function handleIngredientDrop(event) {
    event.preventDefault();
    prepDisplay.classList.remove('drag-over');

    const isCustomerWaiting = currentParty && currentParty.members.some(c => c.state === 'waiting');
    if (!isCustomerWaiting) { showMessage("No party members waiting for an order!", "orange"); return; }
    // Drop allowed

    const ingredientName = event.dataTransfer.getData('text/plain');
    if (ingredientName && INGREDIENTS[ingredientName]) {
        currentPreparation.push(ingredientName);
        updatePrepDisplay();
    } else {
        console.warn("Ingredient drop event occurred, but no valid ingredient data found.");
    }
}

// UPDATED: Finished Dish Drag Start (Check specific dish animation status)
function handleDishDragStart(event) {
    const dishInstanceId = event.target.dataset.dishInstanceId;
    if (!dishInstanceId) {
         console.error("Missing dish instance ID on dragged item:", event.target);
         event.preventDefault(); return;
    }

    // Prevent dragging IF THIS SPECIFIC DISH is currently animating
    if (animatingDishIds.has(dishInstanceId)) {
        showMessage("This dish is already being served!", "orange");
        event.preventDefault();
        return;
    }

    // Drag allowed
    event.dataTransfer.setData('application/sushi-dish-instance', dishInstanceId);
    event.dataTransfer.effectAllowed = 'move';

    const dishData = finishedDishes.find(d => d.id === dishInstanceId);
    if (!dishData) {
         console.error(`Dish data for instance ID ${dishInstanceId} not found in queue.`);
         event.preventDefault();
         return;
    }
}

// UPDATED: Belt Drag Over (Only check data type)
 function handleBeltDragOver(event) {
    event.preventDefault();
    // Allow drop visual effect if it's a dish instance, regardless of animation state
    if (event.dataTransfer.types.includes('application/sushi-dish-instance')) {
        event.dataTransfer.dropEffect = 'move';
    } else {
        event.dataTansfer.dropEffect = 'none'; // Typo corrected
    }
}
// UPDATED: Belt Drag Enter (Only check data type)
function handleBeltDragEnter(event) {
    event.preventDefault();
    // Allow visual feedback if it's a dish instance
    if (event.dataTransfer.types.includes('application/sushi-dish-instance')) {
        sushiBeltContainer.classList.add('drag-over');
    }
}
// Belt Drag Leave - No change needed
function handleBeltDragLeave(event) {
    event.preventDefault();
    // Use try-catch for broader browser compatibility with relatedTarget
    try {
        if (!sushiBeltContainer.contains(event.relatedTarget)) {
            sushiBeltContainer.classList.remove('drag-over');
        }
    } catch (e) {
        // Fallback if relatedTarget isn't supported or is null/undefined
        sushiBeltContainer.classList.remove('drag-over');
    }
}


// UPDATED: Belt Drop (Check specific dish animation status, add to Set)
function handleBeltDrop(event) {
    event.preventDefault();
    sushiBeltContainer.classList.remove('drag-over');

    const droppedDishInstanceId = event.dataTransfer.getData('application/sushi-dish-instance');
    if (!droppedDishInstanceId) {
        showMessage("Invalid item dropped on belt.", "orange");
        return;
    }

    // Check if THIS SPECIFIC DISH is already animating
    if (animatingDishIds.has(droppedDishInstanceId)) {
         showMessage("That dish is already being served!", "orange");
         return;
    }

    // Find the dish data in the queue
    const dishIndex = finishedDishes.findIndex(dish => dish.id === droppedDishInstanceId);

    if (dishIndex !== -1) {
        const servedDishData = finishedDishes[dishIndex]; // Get data { id, recipe, customerId }
        const dishVisualElement = finishedDishDisplay.querySelector(`.finished-dish-item[data-dish-instance-id="${droppedDishInstanceId}"]`);
        const servedDishVisualText = dishVisualElement ? dishVisualElement.textContent : '?';

        // --- Critical Order ---
        // 1. Add to animating Set BEFORE starting animation
        animatingDishIds.add(droppedDishInstanceId);

        // 2. Remove from the main queue array
        finishedDishes.splice(dishIndex, 1);

        // 3. Remove from the visual queue display
        removeFinishedDishFromDisplay(droppedDishInstanceId);
        // --- End Critical Order ---


        // 4. Start the animation
        showMessage(`Serving ${servedDishData.recipe.name}...`, "blue");
        animateDishOrbit(servedDishVisualText, servedDishData); // This function will handle removing the ID from the Set on completion

    } else {
        // This might happen if the dish was somehow removed between drag start and drop
        console.error(`Dropped dish instance ID ${droppedDishInstanceId} not found in finishedDishes queue.`);
        showMessage("Error serving dish - not found in queue.", "red");
        // Ensure ID is not lingering in animating set if we errored before adding
        animatingDishIds.delete(droppedDishInstanceId);
    }
}