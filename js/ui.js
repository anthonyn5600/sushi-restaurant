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

// --- UI Update Functions --- (Most remain unchanged)
function updateScoreDisplay() {
    scoreDisplay.textContent = score;
}

function showMessage(text, type = "black") {
    messageArea.textContent = text;
    messageArea.className = 'message-area'; // Reset classes
    // Apply type classes for styling
    if (type === 'green') messageArea.classList.add('message-success');
    else if (type === 'red') messageArea.classList.add('message-error');
    else if (type === 'orange') messageArea.classList.add('message-warning');
    else if (type === 'blue') messageArea.classList.add('message-info');
    // Note: Color is now primarily handled by CSS classes
}

function updatePrepDisplay() {
    prepDisplay.textContent = currentPreparation.map(name => INGREDIENTS[name]).join(' ');
}

// UPDATED: Add conditional tap listener for mobile
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

    if (IS_MOBILE) {
        dishVisual.draggable = false; // Disable drag on mobile
        dishVisual.classList.add('mobile-tappable'); // Add class for potential styling
        dishVisual.addEventListener('click', handleFinishedDishTap); // Add tap listener
    } else {
        dishVisual.draggable = true; // Ensure draggable on desktop
        dishVisual.addEventListener('dragstart', handleDishDragStart); // Add drag listener
    }

    finishedDishDisplay.appendChild(dishVisual);
}

function removeFinishedDishFromDisplay(dishInstanceId) {
    const dishElement = finishedDishDisplay.querySelector(`.finished-dish-item[data-dish-instance-id="${dishInstanceId}"]`);
    if (dishElement) {
        // Clean up event listeners before removing (important for mobile tap)
        if (IS_MOBILE) {
            dishElement.removeEventListener('click', handleFinishedDishTap);
        } else {
            dishElement.removeEventListener('dragstart', handleDishDragStart);
        }
        dishElement.remove();
    } else {
        console.warn(`Could not find dish element with ID ${dishInstanceId} to remove from display.`);
    }
}

function clearFinishedDishDisplay() {
    // Need to remove listeners from children before clearing innerHTML
    Array.from(finishedDishDisplay.children).forEach(child => {
        const dishInstanceId = child.dataset.dishInstanceId;
        if(dishInstanceId) {
            removeFinishedDishFromDisplay(dishInstanceId); // Use existing function which handles listener cleanup
        } else {
            child.remove(); // Remove other potential elements like placeholders if any
        }
    });
     finishedDishDisplay.innerHTML = ''; // Clear completely after cleanup
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
        // Add specific state classes if needed for more complex styling
        // if (customer.state === 'eating') seatDiv.classList.add('state-eating'); // Already handled by state-eating
        // if (customer.state === 'finished') seatDiv.classList.add('state-finished'); // Already handled by state-finished

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
             // Reset classes and apply current state
             seatDiv.className = 'customer-table-seat'; // Base class
             seatDiv.classList.add(`state-${customer.state}`); // Add current state class

             renderCustomerStatus(statusDiv, customer);
        }
    }
    updateHungerMeterDisplay();
    // No need to call updateCurrentOrdersDisplay here, called by state change functions
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
             } else { statusDiv.textContent = "?"; } // Should not happen if state is waiting
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
                // Fade out effect based on progress
                visualSpan.style.opacity = Math.max(0.1, 1 - (customer.eatingProgress / 100)); // Keep slightly visible
                statusDiv.appendChild(visualSpan);
            } else { statusDiv.textContent = "Eating (?)"; } // Should not happen
            break;
         case 'finished':
             const finishedText = document.createElement('span');
             // Use textContent for safety, rely on CSS for styling
             finishedText.textContent = "✅ Satisfied!";
             // Styling moved to .state-finished .customer-status-display in CSS if needed
             statusDiv.appendChild(finishedText);
             break;
        default: statusDiv.textContent = "...";
    }
}

// UPDATED: Add conditional tap/drag listeners
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

// --- Animation Function --- (Remains the same, but called by tap handler too)
function animateDishOrbit(dishVisualText, servedDishData) {
    const dishInstanceId = servedDishData.id;

    if (!gameArea || !tableArea || !dishVisualText || !servedDishData || !servedDishData.customerId) {
        console.error("Missing elements or data for orbit animation:", { dishVisualText, servedDishData });
        animatingDishIds.delete(dishInstanceId); // Clean up if animation can't start
        return;
    }

    // Prevent duplicate animations for the same dish ID
    if (document.querySelector(`.orbiting-dish[data-orbit-id="${dishInstanceId}"]`)) {
        console.warn(`Orbit animation already exists for dish ID: ${dishInstanceId}`);
        // Don't delete from animatingDishIds here, let the existing animation handle it.
        return;
    }


    const orbiter = document.createElement('div');
    orbiter.classList.add('orbiting-dish');
    orbiter.textContent = dishVisualText;
    orbiter.dataset.orbitId = dishInstanceId; // Add ID for tracking/debugging
    document.body.appendChild(orbiter);


    const gameAreaRect = gameArea.getBoundingClientRect();
    const tableAreaRect = tableArea.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    // Use finishedDishDisplay as the visual source for start point calculation
    const queueRect = finishedDishDisplay.getBoundingClientRect();

    // Get orbiter dimensions *after* adding content and appending to body (or set explicit size)
    const orbiterRect = orbiter.getBoundingClientRect();
    const offsetX = orbiterRect.width / 2;
    const offsetY = orbiterRect.height / 2;

    // Start position: near the finished dish queue visually
    const startX = queueRect.left + queueRect.width / 2 + scrollX - offsetX;
    // const startY = queueRect.bottom + scrollY - offsetY + 10; // Start slightly below the queue
    const startY = queueRect.top + queueRect.height / 2 + scrollY - offsetY; // Start centered vertically in queue


    // Define path relative to the *game area* for orbit boundary
     const path = {
         topLeft: { x: gameAreaRect.left + scrollX - offsetX + 30, y: gameAreaRect.top + scrollY - offsetY + 30 },
         topRight: { x: gameAreaRect.right + scrollX - offsetX - 30, y: gameAreaRect.top + scrollY - offsetY + 30 },
         bottomRight: { x: gameAreaRect.right + scrollX - offsetX - 30, y: gameAreaRect.bottom + scrollY - offsetY - 30 },
         bottomLeft: { x: gameAreaRect.left + scrollX - offsetX + 30, y: gameAreaRect.bottom + scrollY - offsetY - 30 },
     };

    // End position: center of the table area
    const endX = tableAreaRect.left + scrollX + tableAreaRect.width / 2 - offsetX;
    const endY = tableAreaRect.top + scrollY + tableAreaRect.height / 2 - offsetY;

    orbiter.style.position = 'absolute';
    orbiter.style.top = `${startY}px`;
    orbiter.style.left = `${startX}px`;
    orbiter.style.opacity = '0'; // Start invisible

    // Define Keyframes for a smoother, more circular-like path
    const keyframes = [
        { transform: `translate(0, 0) scale(0.8)`, opacity: 0, offset: 0 }, // Start point (fade in, small scale)
        { transform: `translate(0, 0) scale(1)`, opacity: 1, offset: 0.05 }, // Fade in quickly
        { transform: `translate(${path.topLeft.x - startX}px, ${path.topLeft.y - startY}px) scale(1.1)`, opacity: 1, offset: 0.25 }, // Move to top-left, slightly larger
        { transform: `translate(${path.topRight.x - startX}px, ${path.topRight.y - startY}px) scale(1)`, opacity: 1, offset: 0.5 }, // Move to top-right
        { transform: `translate(${path.bottomRight.x - startX}px, ${path.bottomRight.y - startY}px) scale(0.9)`, opacity: 1, offset: 0.75 }, // Move to bottom-right, slightly smaller
        { transform: `translate(${endX - startX}px, ${endY - startY}px) scale(0.5)`, opacity: 0, offset: 1 } // Move to end point (fade out, small scale)
    ];


    const options = { duration: 3000, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }; // Smoother ease

    let fallbackTimeout;

    const cleanupOrbiter = (reason = "unknown") => {
         // Only remove from set if it's still considered animating
         if (animatingDishIds.has(dishInstanceId)) {
             // console.log(`Cleaning up orbiter ${dishInstanceId} (${reason}).`); // Debug log
             animatingDishIds.delete(dishInstanceId); // << REMOVE ID FROM SET
         } else {
             // console.log(`Orbiter ${dishInstanceId} already cleaned up (${reason}).`); // Debug log
         }
         if (orbiter.parentNode) orbiter.parentNode.removeChild(orbiter); // Clean up element
         clearTimeout(fallbackTimeout); // Clear self if called by fallback
    };

    const handleServeSuccess = () => {
        // console.log(`Animation finished for ${dishInstanceId}.`); // Debug log
        const customer = findCustomerById(servedDishData.customerId);
        if (customer && customer.state === 'waiting') {
             score += 10;
             updateScoreDisplay();
             showMessage(`Delivered ${servedDishData.recipe.name} to Customer ${customer.seatNumber}! (+10)`, "green");
             startEating(servedDishData.customerId); // Trigger customer state change
        } else {
            console.warn(`Customer ${servedDishData.customerId} not found or not in 'waiting' state (state: ${customer?.state}) during delivery completion.`);
            showMessage(`Customer ${customer?.seatNumber || servedDishData.customerId} missed the delivery!`, "orange");
            // Potentially penalize score or handle differently?
        }
        cleanupOrbiter("onfinish");
    };


    // --- Start Animation ---
    // console.log(`Starting animation for ${dishInstanceId}`); // Debug log
    const animation = orbiter.animate(keyframes, options);
    animation.onfinish = handleServeSuccess;
    animation.oncancel = () => cleanupOrbiter("oncancel"); // Handle potential cancellation

    // Fallback timeout remains crucial
    fallbackTimeout = setTimeout(() => {
        // console.warn(`Orbiter animation for ${dishInstanceId} cleaned up via fallback timeout.`); // Debug log
        cleanupOrbiter("fallback");
    }, options.duration + 500); // Slightly longer timeout buffer
}


// --- NEW Mobile Tap Handlers ---

function handleIngredientTap(event) {
    // Prevent adding if a dish is animating (optional, could allow queueing)
    // if (animatingDishIds.size > 0) {
    //     showMessage("Please wait for the current delivery!", "orange");
    //     return;
    // }

    // Check if any customer is waiting (same logic as drop)
    const isCustomerWaiting = currentParty && currentParty.members.some(c => c.state === 'waiting');
     if (!isCustomerWaiting) {
         let reason = "No party members waiting for orders";
         if (currentParty && currentParty.members.length > 0) reason = "Party members are thinking, eating, or finished";
         if (!currentParty) reason = "No party at the table";
        showMessage(`${reason}!`, "orange");
        return;
    }

    // Add ingredient to prep
    const ingredientName = event.target.dataset.ingredient;
    if (ingredientName && INGREDIENTS[ingredientName]) {
        currentPreparation.push(ingredientName);
        updatePrepDisplay();
        // Optional: Brief visual feedback on the button?
    } else {
        console.warn("Ingredient tap event occurred, but no valid ingredient data found.");
    }
}

function handleFinishedDishTap(event) {
    const tappedDishInstanceId = event.target.dataset.dishInstanceId;
    if (!tappedDishInstanceId) {
        console.error("Missing dish instance ID on tapped item:", event.target);
        return;
    }

    // Check if THIS SPECIFIC DISH is already animating
    if (animatingDishIds.has(tappedDishInstanceId)) {
         showMessage("That dish is already being served!", "orange");
         return;
    }

    // Find the dish data in the queue
    const dishIndex = finishedDishes.findIndex(dish => dish.id === tappedDishInstanceId);

    if (dishIndex !== -1) {
        const servedDishData = finishedDishes[dishIndex]; // Get data { id, recipe, customerId }
        const dishVisualElement = finishedDishDisplay.querySelector(`.finished-dish-item[data-dish-instance-id="${tappedDishInstanceId}"]`);
        const servedDishVisualText = dishVisualElement ? dishVisualElement.textContent : '?';

        // --- Critical Order: Same as handleBeltDrop ---
        // 1. Add to animating Set BEFORE starting animation
        animatingDishIds.add(tappedDishInstanceId);

        // 2. Remove from the main queue array
        finishedDishes.splice(dishIndex, 1);

        // 3. Remove from the visual queue display (this also removes the tap listener)
        removeFinishedDishFromDisplay(tappedDishInstanceId);
        // --- End Critical Order ---


        // 4. Start the animation
        showMessage(`Serving ${servedDishData.recipe.name}...`, "blue");
        animateDishOrbit(servedDishVisualText, servedDishData); // Reuse the same animation function

    } else {
        // This might happen if the dish was somehow removed between display and tap (unlikely but possible)
        console.error(`Tapped dish instance ID ${tappedDishInstanceId} not found in finishedDishes queue.`);
        showMessage("Error serving dish - not found in queue.", "red");
        // Ensure ID is not lingering in animating set if we errored before adding
        animatingDishIds.delete(tappedDishInstanceId);
    }
}


// --- Desktop Drag and Drop Handlers --- (Largely unchanged, but ensure they aren't called on mobile if drag disabled)

// Ingredient D&D (Drag Start)
function handleIngredientDragStart(event) {
    // Check if mobile flag is set - if so, prevent drag (shouldn't be needed if draggable=false)
    if (IS_MOBILE) {
        event.preventDefault();
        return;
    }

    const isCustomerWaiting = currentParty && currentParty.members.some(c => c.state === 'waiting');
    if (!isCustomerWaiting) {
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

// Ingredient D&D (Drag Over Prep Display)
function handleIngredientDragOver(event) {
    if (IS_MOBILE) return; // Ignore drag events on mobile
    event.preventDefault();
    // Check if the dragged data is an ingredient (simple check)
    if (event.dataTransfer.types.includes('text/plain')) {
        event.dataTransfer.dropEffect = 'copy';
    } else {
        event.dataTransfer.dropEffect = 'none';
    }
}

// Ingredient D&D (Drag Enter Prep Display)
function handleIngredientDragEnter(event) {
     if (IS_MOBILE) return; // Ignore drag events on mobile
     event.preventDefault();
     // Check if entering the prepDisplay itself and dragging text/plain
     if (event.target === prepDisplay && event.dataTransfer.types.includes('text/plain')) {
       prepDisplay.classList.add('drag-over');
     }
}

// Ingredient D&D (Drag Leave Prep Display)
function handleIngredientDragLeave(event) {
     if (IS_MOBILE) return; // Ignore drag events on mobile
     event.preventDefault();
     // Check if leaving the prepDisplay or moving to a child element
      try { // Use try-catch for relatedTarget robustness
          if (event.target === prepDisplay && !prepDisplay.contains(event.relatedTarget)) {
             prepDisplay.classList.remove('drag-over');
          }
      } catch(e) { // Fallback if relatedTarget access fails
          prepDisplay.classList.remove('drag-over');
      }
}

// Ingredient D&D (Drop on Prep Display)
function handleIngredientDrop(event) {
    if (IS_MOBILE) return; // Ignore drag events on mobile
    event.preventDefault();
    prepDisplay.classList.remove('drag-over');

    // Check conditions again on drop, just in case
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

// Finished Dish D&D (Drag Start)
function handleDishDragStart(event) {
    if (IS_MOBILE) { // Should not trigger if draggable=false, but good failsafe
        event.preventDefault();
        return;
    }

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

    // Find dish data to potentially add more info if needed (currently just ID)
    const dishData = finishedDishes.find(d => d.id === dishInstanceId);
    if (!dishData) {
         console.error(`Dish data for instance ID ${dishInstanceId} not found in queue.`);
         event.preventDefault();
         return;
    }

    // Set the data - use a custom type for clarity
    event.dataTransfer.setData('application/sushi-dish-instance', dishInstanceId);
    event.dataTransfer.effectAllowed = 'move';

    // Optional: Add visual cue to the dragged element
    // event.target.style.opacity = '0.5';
}

// Finished Dish D&D (Drag Over Belt)
 function handleBeltDragOver(event) {
    if (IS_MOBILE) return; // Ignore drag events on mobile
    event.preventDefault();
    // Allow drop visual effect only if it's a dish instance
    if (event.dataTransfer.types.includes('application/sushi-dish-instance')) {
        event.dataTransfer.dropEffect = 'move';
    } else {
        event.dataTransfer.dropEffect = 'none';
    }
}

// Finished Dish D&D (Drag Enter Belt)
function handleBeltDragEnter(event) {
    if (IS_MOBILE) return; // Ignore drag events on mobile
    event.preventDefault();
    // Allow visual feedback only if it's a dish instance
    if (event.dataTransfer.types.includes('application/sushi-dish-instance') && event.currentTarget === sushiBeltContainer) {
        sushiBeltContainer.classList.add('drag-over');
    }
}

// Finished Dish D&D (Drag Leave Belt)
function handleBeltDragLeave(event) {
    if (IS_MOBILE) return; // Ignore drag events on mobile
    event.preventDefault();
    // More robust check for leaving the container itself
    try {
        if (event.currentTarget === sushiBeltContainer && !sushiBeltContainer.contains(event.relatedTarget)) {
            sushiBeltContainer.classList.remove('drag-over');
        }
    } catch (e) {
        sushiBeltContainer.classList.remove('drag-over'); // Fallback
    }
}


// Finished Dish D&D (Drop on Belt)
function handleBeltDrop(event) {
    if (IS_MOBILE) return; // Ignore drag events on mobile
    event.preventDefault();
    sushiBeltContainer.classList.remove('drag-over');
    // Optional: Reset opacity if changed on drag start
    // const draggedElement = document.querySelector(`.finished-dish-item[data-dish-instance-id="${droppedDishInstanceId}"]`);
    // if (draggedElement) draggedElement.style.opacity = '1';


    const droppedDishInstanceId = event.dataTransfer.getData('application/sushi-dish-instance');
    if (!droppedDishInstanceId) {
        showMessage("Invalid item dropped on belt.", "orange");
        return;
    }

    // Check if THIS SPECIFIC DISH is already animating (redundant check, but safe)
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

        // --- Critical Order: Same as handleFinishedDishTap ---
        // 1. Add to animating Set BEFORE starting animation
        animatingDishIds.add(droppedDishInstanceId);

        // 2. Remove from the main queue array
        finishedDishes.splice(dishIndex, 1);

        // 3. Remove from the visual queue display (this also removes drag listener)
        removeFinishedDishFromDisplay(droppedDishInstanceId);
        // --- End Critical Order ---


        // 4. Start the animation
        showMessage(`Serving ${servedDishData.recipe.name}...`, "blue");
        animateDishOrbit(servedDishVisualText, servedDishData); // Reuse animation

    } else {
        // Dish not found - might have been tapped/served simultaneously?
        console.error(`Dropped dish instance ID ${droppedDishInstanceId} not found in finishedDishes queue.`);
        showMessage("Error serving dish - not found in queue.", "red");
        animatingDishIds.delete(droppedDishInstanceId); // Clean up just in case
    }
}