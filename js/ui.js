// --- UI Update Functions & DOM References ---

// --- Constants ---
const DELIVER_ALL_STAGGER_MS = 300; // Delay between starting each animation in Deliver All (in milliseconds)

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
const deliverFoodButton = document.getElementById('deliver-food-btn'); // Reference for "Deliver Next"
const deliverAllButton = document.getElementById('deliver-all-btn'); // ADDED Reference for "Deliver All"

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

// --- UPDATED: Add click listener and title, handles unknown dish visual ---
function addFinishedDishToDisplay(finishedDishData) {
    const dishVisual = document.createElement('span');
    dishVisual.classList.add('finished-dish-item');
    dishVisual.dataset.dishInstanceId = finishedDishData.id;

    // Use the visual directly from the recipe object (handles known and unknown dishes)
    let visualText = finishedDishData.recipe.visual;

    // Special handling for known recipes with rice (if visual doesn't already include it)
    if (finishedDishData.recipe.name !== "Unknown Dish" &&
        finishedDishData.recipe.ingredients.includes('rice') &&
        !visualText.startsWith(INGREDIENTS['rice']))
    {
        visualText = INGREDIENTS['rice'] + ' ' + visualText;
    }

    dishVisual.textContent = visualText;

    // Add tooltip and click listener for discarding
    const penalty = 1;
    dishVisual.title = `Click to discard ${finishedDishData.recipe.name} (-${penalty} point)`;
    dishVisual.addEventListener('click', handleDiscardDishClick); // Add listener

    finishedDishDisplay.appendChild(dishVisual);
    updateDeliverButtonState(); // Update button state when a dish is added
}

// --- UPDATED: handleDiscardDishClick (No functional change needed here from last version) ---
function handleDiscardDishClick(event) {
    const dishElement = event.currentTarget; // The clicked span element
    const dishInstanceId = dishElement.dataset.dishInstanceId;

    // Prevent discarding if the dish is currently being delivered/animated
    if (animatingDishIds.has(dishInstanceId)) {
        showMessage("Cannot discard a dish that is currently being delivered!", "orange");
        return;
    }

    // Find the index of the dish in the logical queue
    const dishIndex = finishedDishes.findIndex(dish => dish.id === dishInstanceId);

    if (dishIndex > -1) {
        const discardedDishName = finishedDishes[dishIndex].recipe.name;
        const penalty = 1; // Keep penalty consistent

        // Remove from logical queue
        finishedDishes.splice(dishIndex, 1);

        // Remove from visual queue
        dishElement.remove(); // Already have the element reference

        // Apply penalty
        score -= penalty; // Penalty for discarding
        if (score < 0) score = 0;
        updateScoreDisplay();

        // Show feedback message
        showMessage(`Discarded ${discardedDishName}. (-${penalty} point)`, "orange");

        // Update the deliver button state as the queue has changed
        updateDeliverButtonState();
    } else {
        console.warn(`Attempted to discard dish with ID ${dishInstanceId}, but it was not found in the finishedDishes array.`);
        // Optionally remove the element anyway if it exists visually but not logically
        if (dishElement.parentNode) {
             dishElement.remove();
             updateDeliverButtonState();
        }
    }
}


// --- UPDATED: removeFinishedDishFromDisplay - Now ONLY removes visually ---
// This is called by the animation cleanup now, not directly by delivery logic.
function removeFinishedDishFromDisplay(dishInstanceId) {
    const dishElement = finishedDishDisplay.querySelector(`.finished-dish-item[data-dish-instance-id="${dishInstanceId}"]`);
    if (dishElement) {
        dishElement.remove();
        // DO NOT update button state here, it's handled by animation end / deliver all start
    } else {
        // This might happen if the queue was cleared visually by Deliver All
        // console.warn(`Could not find dish element with ID ${dishInstanceId} to remove from display (might have been cleared by Deliver All).`);
    }
}

// --- UPDATED: clearFinishedDishDisplay - Now also called by Deliver All ---
function clearFinishedDishDisplay() {
    // Clear visual representation
    Array.from(finishedDishDisplay.children).forEach(child => {
        // Important: Remove event listeners to prevent memory leaks if elements are somehow held elsewhere
         const instanceId = child.dataset.dishInstanceId;
         // Assuming handleDiscardDishClick is the listener function reference stored globally or accessible here
         // If not, you might need a more robust way to track/remove listeners
         // For simplicity, assuming direct reference works for now:
         child.removeEventListener('click', handleDiscardDishClick);
         child.remove();
    });
    finishedDishDisplay.innerHTML = ''; // Ensure it's fully empty

    // Note: Do not update button state here directly, call it explicitly where needed
    // updateDeliverButtonState();
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
// --- UPDATED: animateDishOrbit - Call removeFinishedDishFromDisplay on cleanup ---
function animateDishOrbit(dishVisualText, servedDishData) {
    const dishInstanceId = servedDishData.id;
     // Ensure servedDishData and recipe exist
    if (!gameArea || !tableArea || !dishVisualText || !servedDishData || !servedDishData.recipe) {
        console.error("Missing elements or data for orbit animation:", { dishVisualText, servedDishData });
        if (animatingDishIds.has(dishInstanceId)) {
            animatingDishIds.delete(dishInstanceId); // Clean up animation tracker
            updateDeliverButtonState(); // Update buttons if animation failed to start
        }
        return;
    }

    // Safety check: If element already exists, don't create another
    if (document.querySelector(`.orbiting-dish[data-orbit-id="${dishInstanceId}"]`)) {
        console.warn(`Orbit animation already exists for dish ID: ${dishInstanceId}`);
        return; // Avoid duplicate animations
    }

    const orbiter = document.createElement('div');
    orbiter.classList.add('orbiting-dish');
    orbiter.textContent = dishVisualText;
    orbiter.dataset.orbitId = dishInstanceId; // Use dataset for easier selection
    document.body.appendChild(orbiter); // Append to body to avoid layout shifts

    // --- Calculate Positions ---
    const gameAreaRect = gameArea.getBoundingClientRect();
    const tableAreaRect = tableArea.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    // Find the original visual element in the queue (if it still exists) for start position
    const startElement = finishedDishDisplay.querySelector(`.finished-dish-item[data-dish-instance-id="${dishInstanceId}"]`);
    let startRect;
    if(startElement) {
        startRect = startElement.getBoundingClientRect();
    } else {
        // Fallback if element was already removed (e.g., by Deliver All visual clear)
        // Start from the center of the (potentially empty) queue display area
        startRect = finishedDishDisplay.getBoundingClientRect();
    }

    const orbiterRect = orbiter.getBoundingClientRect(); // Get orbiter size *after* adding content
    const offsetX = orbiterRect.width / 2;
    const offsetY = orbiterRect.height / 2;

    const startX = startRect.left + startRect.width / 2 + scrollX - offsetX;
    const startY = startRect.top + startRect.height / 2 + scrollY - offsetY;

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
    orbiter.style.opacity = '0'; // Start invisible

    // --- Animation Definition ---
    const keyframes = [
        { transform: `translate(0, 0) scale(0.8)`, opacity: 0, offset: 0 }, // Fade in at start position
        { transform: `translate(0, 0) scale(1)`, opacity: 1, offset: 0.05 },
        { transform: `translate(${path.topLeft.x - startX}px, ${path.topLeft.y - startY}px) scale(1.1)`, opacity: 1, offset: 0.25 }, // Move to points
        { transform: `translate(${path.topRight.x - startX}px, ${path.topRight.y - startY}px) scale(1)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${path.bottomRight.x - startX}px, ${path.bottomRight.y - startY}px) scale(0.9)`, opacity: 1, offset: 0.75 },
        { transform: `translate(${endX - startX}px, ${endY - startY}px) scale(0.5)`, opacity: 0, offset: 1 } // Move to end and fade out
    ];
    const options = { duration: 3000, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' };
    let fallbackTimeout;

    // --- Cleanup Function (Removes Orbiter, Updates State) ---
    const cleanupOrbiter = (reason = "unknown") => {
         // Remove the visual representation from the queue IF IT STILL EXISTS
         // (It might have been removed by Deliver All's visual clear)
         removeFinishedDishFromDisplay(dishInstanceId);

         // Clean up animation tracker
         if (animatingDishIds.has(dishInstanceId)) {
             animatingDishIds.delete(dishInstanceId);
             updateDeliverButtonState(); // Update buttons AFTER removing from set
         }
         // Remove the orbiting element itself
         if (orbiter.parentNode) orbiter.parentNode.removeChild(orbiter);
         clearTimeout(fallbackTimeout); // Clear safety timer
         // console.log(`Cleanup orbiter ${dishInstanceId} due to: ${reason}`);
    };

    // --- Delivery Result Logic (On Animation Finish) ---
    const handleServeSuccess = () => {
        let targetCustomer = null;
        if (currentParty && servedDishData.recipe) {
            targetCustomer = currentParty.members.find(c =>
                c.state === 'waiting' &&
                c.order &&
                c.order.name === servedDishData.recipe.name
            );
        }

        if (targetCustomer) {
             score += 10;
             updateScoreDisplay();
             showMessage(`Delivered ${servedDishData.recipe.name} to Customer ${targetCustomer.seatNumber}! (+10)`, "green");
             startEating(targetCustomer.id);
        } else {
            score -= 5;
            if (score < 0) score = 0;
            updateScoreDisplay();
            let reason = `No one waiting wanted ${servedDishData.recipe.name || 'this dish'}.`;
            if (!currentParty || currentParty.members.filter(c => c.state === 'waiting').length === 0) {
                reason = "No customers were waiting for any order.";
            }
            // Distinguish unknown dish penalty message slightly
            if (servedDishData.recipe.name === "Unknown Dish") {
                 showMessage(`Delivered an Unknown Dish! ${reason} (-5 points)`, "red");
            } else {
                 showMessage(`Wrong Dish! ${reason} (-5 points)`, "red");
            }
        }
        cleanupOrbiter("onfinish"); // Run cleanup
    };

    // --- Start Animation ---
    const animation = orbiter.animate(keyframes, options);
    animation.onfinish = handleServeSuccess; // Call result logic when done
    animation.oncancel = () => cleanupOrbiter("oncancel"); // Cleanup if cancelled
    // Safety timeout in case onfinish doesn't fire
    fallbackTimeout = setTimeout(() => cleanupOrbiter("fallback_timeout"), options.duration + 500);

    // No button update here - it's handled when adding to animatingDishIds
}


// --- Mobile Ingredient Tap Handler ---
function handleIngredientTap(event) {
    const ingredientName = event.target.dataset.ingredient;
    if (ingredientName && INGREDIENTS[ingredientName]) {
        currentPreparation.push(ingredientName);
        updatePrepDisplay();
    } else {
        console.warn("Ingredient tap event occurred, but no valid ingredient data found.");
    }
}

// --- Deliver Next Button Handler ---
// --- UPDATED: Simplify - just handles the single dish case ---
function handleDeliverFoodClick() {
    if (finishedDishes.length === 0 || animatingDishIds.size > 0) { // Check if *anything* is animating
        showMessage("No dish ready or delivery in progress!", "orange");
        return;
    }

    // Double check if the *specific* next dish is somehow already animating (shouldn't happen with above check)
    if (animatingDishIds.has(finishedDishes[0].id)) {
        showMessage("Next dish is already delivering!", "orange");
        return;
    }

    const servedDishData = finishedDishes[0]; // Get the first dish

    // --- Critical State Update ---
    animatingDishIds.add(servedDishData.id); // Mark as animating
    // We DO NOT shift() from finishedDishes here. Animation cleanup handles logical removal later.
    // We remove the *visual* element inside animateDishOrbit's cleanup.
    updateDeliverButtonState(); // Disable buttons immediately
    // --- End Critical State Update ---

    // Find the visual text
    const dishVisualElement = finishedDishDisplay.querySelector(`.finished-dish-item[data-dish-instance-id="${servedDishData.id}"]`);
    const servedDishVisualText = dishVisualElement ? dishVisualElement.textContent : (servedDishData.recipe.visual || '?');

    showMessage(`Serving ${servedDishData.recipe.name}...`, "blue");
    animateDishOrbit(servedDishVisualText, servedDishData); // Start animation
}

// --- NEW: Deliver All Button Handler ---
function handleDeliverAllClick() {
     if (finishedDishes.length <= 1 || animatingDishIds.size > 0) {
         // Should be prevented by button state, but good safety check
        showMessage("Not enough dishes in queue or delivery already in progress!", "orange");
        return;
    }

    showMessage(`Serving all ${finishedDishes.length} dishes...`, "blue");

    // --- Critical State Update ---
    const dishesToDeliver = [...finishedDishes]; // Create a copy to iterate over
    finishedDishes = []; // Clear the logical queue immediately
    dishesToDeliver.forEach(dish => animatingDishIds.add(dish.id)); // Mark ALL as animating AFTER clearing logical queue
    clearFinishedDishDisplay(); // Clear the visual queue immediately
    updateDeliverButtonState(); // Disable buttons based on empty queue / animating state
    // --- End Critical State Update ---


    // Animate each dish with a stagger
    dishesToDeliver.forEach((dishData, index) => {
        // Find visual text (use data from the copied object)
        // We need to reconstruct the visual text here as the elements are gone
        let actualVisualText = dishData.recipe.visual || '?';
         if (dishData.recipe.name !== "Unknown Dish" &&
             dishData.recipe.ingredients.includes('rice') &&
             !actualVisualText.startsWith(INGREDIENTS['rice'])) {
             actualVisualText = INGREDIENTS['rice'] + ' ' + actualVisualText;
         }

        // Use setTimeout to stagger the animation starts
        setTimeout(() => {
            // Double check it wasn't somehow removed from animating set prematurely
            if(animatingDishIds.has(dishData.id)) {
                 animateDishOrbit(actualVisualText, dishData);
            } else {
                console.warn(`Skipping animation for ${dishData.id}, it was removed from animating set.`);
            }
        }, index * DELIVER_ALL_STAGGER_MS); // Stagger based on index
    });
}


// --- Function to manage button states ---
// --- UPDATED: To handle both buttons ---
function updateDeliverButtonState() {
    const queueLength = finishedDishes.length;
    const isAnimating = animatingDishIds.size > 0;

    // Deliver Next Button: Enabled if queue has items AND no animations are running
    deliverFoodButton.disabled = queueLength === 0 || isAnimating;

    // Deliver All Button: Enabled if queue has MORE than 1 item AND no animations are running
    deliverAllButton.disabled = queueLength <= 1 || isAnimating;
}


// --- Desktop Ingredient Drag and Drop Handlers ---
function handleIngredientDragStart(event) {
    if (IS_MOBILE) { event.preventDefault(); return; }
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
    const ingredientName = event.dataTransfer.getData('text/plain');
    if (ingredientName && INGREDIENTS[ingredientName]) {
        currentPreparation.push(ingredientName);
        updatePrepDisplay();
    } else {
        console.warn("Ingredient drop event occurred, but no valid ingredient data found.");
        showMessage("Could not add ingredient from drop.", "orange");
    }
}

// --- Initial Event Listener Setup (in DOMContentLoaded or similar) ---
// Make sure this runs after the DOM is loaded (e.g., inside game.js's DOMContentLoaded)
// Example structure (assuming called from game.js):
// document.addEventListener('DOMContentLoaded', () => {
//     // ... other initializations in game.js ...
//
//     // Find buttons (could be done here or rely on global refs if careful)
//     const deliverBtn = document.getElementById('deliver-food-btn');
//     const deliverAllBtn = document.getElementById('deliver-all-btn');
//
//     if (deliverBtn) deliverBtn.addEventListener('click', handleDeliverFoodClick);
//     if (deliverAllBtn) deliverAllBtn.addEventListener('click', handleDeliverAllClick); // ADDED Listener
//
//     // initGame() call ...
// });
// Note: If ui.js is loaded before game.js, these listeners need to be added
// in game.js's DOMContentLoaded listener as shown above.