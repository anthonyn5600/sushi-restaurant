// --- Global Game State Variables ---
let score = 0;
let currentParty = null;
let currentPreparation = [];
let finishedDishes = [];
// let isAnimating = false; // REMOVED
let animatingDishIds = new Set(); // NEW: Tracks IDs of dishes currently animating
let activePonderTimers = {};
let activeEatingTimers = {};

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
    if (!currentParty || !currentParty.members || typeof currentParty.satisfaction === 'undefined' || typeof currentParty.targetSatisfaction === 'undefined') {
        return;
    }

    if (currentParty.satisfaction >= currentParty.targetSatisfaction) {
        showMessage(`Party satisfied! They are leaving.`, "green");
        clearAllTimers();

        // Clear any remaining finished dishes queue
        finishedDishes = [];
        clearFinishedDishDisplay();

        // Note: Running animations will complete or be cleaned up by their own logic.
        // We might want to explicitly cancel animations for leaving customers later if needed.
        // For now, just clear the tracking set when the new party is about to spawn.

        setTimeout(() => {
            currentParty = null;
            animatingDishIds.clear(); // Clear tracking when table is fully cleared
            updateTableDisplay();
            updateHungerMeterDisplay();
            updateCurrentOrdersDisplay();
            showMessage("Table empty. Next party arriving soon...", "black");

            setTimeout(spawnNewParty, PARTY_LEAVE_DELAY_MS);

        }, 1500);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // --- Core Game Functions ---

    function initGame() {
        score = 0;
        currentParty = null;
        // isAnimating = false; // REMOVED
        animatingDishIds.clear(); // Initialize/clear the set
        currentPreparation = [];
        finishedDishes = [];
        clearAllTimers();

        updateScoreDisplay();
        prepStationTitle.textContent = "Prep Station";
        createIngredientButtons();
        setupIngredientDropZone();
        setupBeltDropZone();
        updateTableDisplay();
        updateHungerMeterDisplay();
        updateCurrentOrdersDisplay();
        spawnNewParty();
        showMessage("Game Started! A party will arrive shortly.", "blue");
        finishPrepButton.disabled = false;
        clearPreparationDisplay();
    }

    function clearPreparationDisplay() {
         prepDisplay.textContent = '';
         prepDisplay.classList.remove('drag-over');
         // Does not clear finished dish display here
    }

    // --- Event Listener Setup --- (No changes needed)
    function setupIngredientDropZone() {
        prepDisplay.addEventListener('dragover', handleIngredientDragOver);
        prepDisplay.addEventListener('dragenter', handleIngredientDragEnter);
        prepDisplay.addEventListener('dragleave', handleIngredientDragLeave);
        prepDisplay.addEventListener('drop', handleIngredientDrop);
    }

    function setupBeltDropZone() {
        sushiBeltContainer.addEventListener('dragover', handleBeltDragOver);
        sushiBeltContainer.addEventListener('dragenter', handleBeltDragEnter);
        sushiBeltContainer.addEventListener('dragleave', handleBeltDragLeave);
        sushiBeltContainer.addEventListener('drop', handleBeltDrop);
    }

    // --- Preparation Logic ---
    function clearPreparation() {
        // No need to check animation status
        currentPreparation = [];
        updatePrepDisplay();
        prepDisplay.classList.remove('drag-over');
        showMessage("Preparation ingredients cleared.", "black");
    }

    // UPDATED: Removed isAnimating check
    function handleFinishPrepClick() {
        // if (isAnimating) { showMessage("Wait for the current dish to be served!", "orange"); return; } // REMOVED CHECK
        if (!currentParty || currentParty.members.length === 0) { showMessage("No party at the table!", "orange"); return; }

        const waitingCustomers = currentParty.members.filter(c => c.state === 'waiting');
        if (waitingCustomers.length === 0) { showMessage("No one in the party is waiting for an order!", "orange"); return; }
        if (currentPreparation.length === 0) { showMessage("Prepare something first!", "orange"); return; }

        const prepSorted = [...currentPreparation].sort().join(',');
        let matchedCustomer = null;

        for (const customer of waitingCustomers) {
            if (customer.order && customer.order.ingredients) {
                const orderSorted = [...customer.order.ingredients].sort().join(',');
                if (prepSorted === orderSorted) {
                    const alreadyQueued = finishedDishes.some(dish => dish.customerId === customer.id);
                    // Also check if a dish for this customer is currently *animating*
                    const alreadyAnimating = [...animatingDishIds].some(animatingId => {
                         const animatingDish = finishedDishes.find(d => d.id === animatingId); // Check original queue for safety
                         // Or potentially need a separate lookup if dish is removed from finishedDishes on drop
                         // Let's assume finishedDishes still holds data until animation ends for simplicity for now. Revisit if needed.
                         // SAFER: We really need the animating dish data directly. Pass it to animation?
                         // Let's stick to the check against the queue for now. If a dish is *dropped*, it's removed.
                         // So, we only need to check finishedDishes queue here.
                         return false; // Simplified: rely on alreadyQueued check for now.
                    });

                    if (!alreadyQueued) { // Removed alreadyAnimating check here, rely on queue check.
                         matchedCustomer = customer;
                         break;
                    } else {
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

            finishedDishes.push(newFinishedDish);
            addFinishedDishToDisplay(newFinishedDish); // Add visually

            currentPreparation = [];
            updatePrepDisplay();

            showMessage(`Dish for Customer ${matchedCustomer.seatNumber} added to queue!`, "blue");
        } else {
             let matchesAnyOrder = false;
             for (const customer of waitingCustomers) {
                  if (customer.order && customer.order.ingredients) {
                      const orderSorted = [...customer.order.ingredients].sort().join(',');
                       if (prepSorted === orderSorted) {
                           matchesAnyOrder = true;
                           break;
                       }
                   }
              }

             if(matchesAnyOrder) {
                 showMessage("Dish for that customer is already in the queue!", "orange");
             } else {
                 score -= 2;
                 if (score < 0) score = 0;
                 updateScoreDisplay();
                 showMessage("Wrong ingredients for anyone waiting! (-2 points)", "red");
             }
        }
    }

    // --- Initial Event Listeners ---
    finishPrepButton.addEventListener('click', handleFinishPrepClick);
    clearPrepButton.addEventListener('click', clearPreparation);

    // --- Start Game ---
    initGame();

}); // End DOMContentLoaded