// --- Global Game State Variables ---
let score = 0;
let currentParty = null;
let currentPreparation = [];
let finishedDishes = []; // Queue of { id, recipe, customerId }
let animatingDishIds = new Set(); // Tracks IDs of dishes currently animating (orbiting)
let activePonderTimers = {}; // Tracks setTimeout IDs for customer pondering
let activeEatingTimers = {}; // Tracks setInterval IDs for customer eating progress

// --- NEW: Mobile Detection ---
function isMobileDevice() {
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
        return true;
    }
    return false;
}
const IS_MOBILE = isMobileDevice(); // Determine once on load

// --- Global Utility Functions ---
function clearAllTimers() {
    Object.values(activePonderTimers).forEach(clearTimeout);
    Object.values(activeEatingTimers).forEach(clearInterval);
    activePonderTimers = {};
    activeEatingTimers = {};
}

function generateUniqueId() {
    return 'dish_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Checks if the party is complete and handles departure/next spawn
function checkPartyCompletion() {
    if (!currentParty || !currentParty.members || currentParty.satisfaction === undefined || currentParty.targetSatisfaction === undefined) {
        console.warn("checkPartyCompletion called with invalid party state.");
        return; // Exit if party state is invalid
    }

    // Check if all members are satisfied
    if (currentParty.satisfaction >= currentParty.targetSatisfaction) {
        showMessage(`Party satisfied! They are leaving.`, "green");
        clearAllTimers(); // Stop all customer timers

        // Clear any remaining dishes in the visual preparation queue
        finishedDishes = [];
        clearFinishedDishDisplay(); // Clears visuals and updates button state

        // Animations in progress will finish or timeout naturally
        animatingDishIds.clear(); // Clear any lingering animation IDs
        updateDeliverButtonState(); // Ensure button is disabled

        // Delay before clearing the table and spawning the next party
        setTimeout(() => {
            currentParty = null; // Remove the party object
            updateTableDisplay(); // Clear customer seats visually
            updateHungerMeterDisplay(); // Reset party meter
            updateCurrentOrdersDisplay(); // Clear waiting orders list
            showMessage("Table empty. Next party arriving soon...", "black");
            updateDeliverButtonState(); // Ensure button is still disabled

            // Delay before the *next* party actually starts spawning
            setTimeout(spawnNewParty, PARTY_LEAVE_DELAY_MS);

        }, 1500); // Delay for "leaving" message visibility
    }
}


// --- Wait for DOM ready ---
document.addEventListener('DOMContentLoaded', () => {

    // --- Core Game Functions ---

    function initGame() {
        console.log(`Initializing game. Mobile detected: ${IS_MOBILE}`);
        score = 0;
        currentParty = null;
        animatingDishIds.clear(); // Initialize/clear the set
        currentPreparation = [];
        finishedDishes = [];
        clearAllTimers(); // Clear any lingering timers from previous state

        updateScoreDisplay();
        prepStationTitle.textContent = "Prep Station";
        createIngredientButtons(); // Creates buttons with appropriate listeners (tap/drag)
        setupIngredientDropZone(); // MODIFIED: Only setup ingredient zone
        updateTableDisplay(); // Initial empty table
        updateHungerMeterDisplay();
        updateCurrentOrdersDisplay();
        clearFinishedDishDisplay(); // Ensure prep queue is visually empty & button disabled
        clearPreparationDisplay(); // Ensure prep display is empty

        finishPrepButton.disabled = false; // Ensure button is enabled
        updateDeliverButtonState(); // Initial button state check (should be disabled)

        showMessage("Game Started! A party will arrive shortly.", "blue");
        spawnNewParty(); // Start the first party arrival process
    }

    function clearPreparationDisplay() {
         prepDisplay.textContent = '';
         prepDisplay.classList.remove('drag-over');
    }

    // MODIFIED: Only setup ingredient drop zone for desktop
    function setupIngredientDropZone() {
        // Only add drag/drop listeners if NOT on mobile
        if (!IS_MOBILE) {
            // Prep Display Drop Zone (for ingredients)
            prepDisplay.addEventListener('dragover', handleIngredientDragOver);
            prepDisplay.addEventListener('dragenter', handleIngredientDragEnter);
            prepDisplay.addEventListener('dragleave', handleIngredientDragLeave);
            prepDisplay.addEventListener('drop', handleIngredientDrop);
        }
        // No belt/dish drop zone setup needed anymore
    }

    // --- Preparation Logic ---

    // Clears the ingredients currently in the preparation area
    function clearPreparation() {
        currentPreparation = [];
        updatePrepDisplay();
        prepDisplay.classList.remove('drag-over'); // Ensure visual state is reset
        showMessage("Preparation ingredients cleared.", "black");
    }

    // Handles clicking the "Finish Prep" button
    function handleFinishPrepClick() {
        if (!currentParty || currentParty.members.length === 0) { showMessage("No party at the table!", "orange"); return; }
        const waitingCustomers = currentParty.members.filter(c => c.state === 'waiting');
        if (waitingCustomers.length === 0) { showMessage("No one in the party is waiting for an order!", "orange"); return; }
        if (currentPreparation.length === 0) { showMessage("Prepare something first!", "orange"); return; }

        const prepSorted = [...currentPreparation].sort().join(',');
        let matchedCustomer = null;
        let dishAlreadyQueued = false;

        for (const customer of waitingCustomers) {
            if (customer.order && customer.order.ingredients) {
                const orderSorted = [...customer.order.ingredients].sort().join(',');
                if (prepSorted === orderSorted) {
                    const alreadyQueued = finishedDishes.some(dish => dish.customerId === customer.id);
                    // const alreadyAnimating = ... // Animating check is handled by deliver button now

                    if (!alreadyQueued) {
                         matchedCustomer = customer;
                         break;
                    } else {
                        dishAlreadyQueued = true;
                        console.log(`Dish for Customer ${customer.seatNumber} already in queue.`);
                    }
                }
            }
        }

        if (matchedCustomer) {
            const dishInstanceId = generateUniqueId();
            const newFinishedDish = {
                id: dishInstanceId,
                recipe: matchedCustomer.order,
                customerId: matchedCustomer.id
            };

            finishedDishes.push(newFinishedDish); // Add to the logical queue
            addFinishedDishToDisplay(newFinishedDish); // Add visually & updates button state

            currentPreparation = []; // Clear the prep area
            updatePrepDisplay();

            showMessage(`Dish for Customer ${matchedCustomer.seatNumber} added to queue!`, "blue");
        } else {
             if(dishAlreadyQueued) {
                 showMessage("Dish prepared matches an order already in the queue!", "orange");
             } else {
                 score -= 2;
                 if (score < 0) score = 0;
                 updateScoreDisplay();
                 showMessage("Wrong ingredients for anyone waiting! (-2 points)", "red");
                 prepDisplay.classList.add('prep-error-flash');
                 setTimeout(() => prepDisplay.classList.remove('prep-error-flash'), 500);
             }
        }
    }

    // --- Initial Event Listeners (for non-dynamic elements) ---
    finishPrepButton.addEventListener('click', handleFinishPrepClick);
    clearPrepButton.addEventListener('click', clearPreparation);
    deliverFoodButton.addEventListener('click', handleDeliverFoodClick); // ADD listener for new button

    // --- Start Game ---
    initGame();

}); // End DOMContentLoaded