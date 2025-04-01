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
    // Prefer pointer detection, fallback to user agent or screen width
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
        return true; // Primary input is coarse (likely touch)
    }
    // Fallback checks (less reliable)
    // const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    // if (/android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())) {
    //     return true;
    // }
    // if (window.innerWidth < 768) { // Example width threshold
    //     return true;
    // }
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
    // Simple unique ID generator for dish instances
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
        // (These weren't served in time or were mistakes)
        finishedDishes = [];
        clearFinishedDishDisplay(); // Clears visuals and listeners

        // Animations in progress will finish or timeout naturally and remove their IDs
        // from animatingDishIds via their own cleanup logic.

        // Delay before clearing the table and spawning the next party
        setTimeout(() => {
            currentParty = null; // Remove the party object
            // It's generally safer to clear animatingDishIds *before* spawning
            // a new party, in case any cleanup timeouts didn't fire yet.
            // However, letting animations finish might be visually preferred.
            // Let's clear it here for robustness. If an animation finishes after this,
            // its cleanup will just find the ID already removed.
            animatingDishIds.clear();

            updateTableDisplay(); // Clear customer seats visually
            updateHungerMeterDisplay(); // Reset party meter
            updateCurrentOrdersDisplay(); // Clear waiting orders list
            showMessage("Table empty. Next party arriving soon...", "black");

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
        setupDropZones(); // Setup drag *drop* zones (still needed for desktop)
        updateTableDisplay(); // Initial empty table
        updateHungerMeterDisplay();
        updateCurrentOrdersDisplay();
        clearFinishedDishDisplay(); // Ensure prep queue is visually empty
        clearPreparationDisplay(); // Ensure prep display is empty

        finishPrepButton.disabled = false; // Ensure button is enabled

        showMessage("Game Started! A party will arrive shortly.", "blue");
        spawnNewParty(); // Start the first party arrival process
    }

    function clearPreparationDisplay() {
         prepDisplay.textContent = '';
         prepDisplay.classList.remove('drag-over');
    }

    // --- Event Listener Setup for Drop Zones (Desktop) ---
    function setupDropZones() {
        // Only add drag/drop listeners if NOT on mobile
        if (!IS_MOBILE) {
            // Prep Display Drop Zone (for ingredients)
            prepDisplay.addEventListener('dragover', handleIngredientDragOver);
            prepDisplay.addEventListener('dragenter', handleIngredientDragEnter);
            prepDisplay.addEventListener('dragleave', handleIngredientDragLeave);
            prepDisplay.addEventListener('drop', handleIngredientDrop);

            // Sushi Belt Drop Zone (for finished dishes)
            sushiBeltContainer.addEventListener('dragover', handleBeltDragOver);
            sushiBeltContainer.addEventListener('dragenter', handleBeltDragEnter);
            sushiBeltContainer.addEventListener('dragleave', handleBeltDragLeave);
            sushiBeltContainer.addEventListener('drop', handleBeltDrop);
        }
        // No 'else' needed - on mobile, these interactions are handled by tap listeners
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
        // Basic checks: Is there a party? Is anyone waiting? Is something prepared?
        if (!currentParty || currentParty.members.length === 0) { showMessage("No party at the table!", "orange"); return; }
        const waitingCustomers = currentParty.members.filter(c => c.state === 'waiting');
        if (waitingCustomers.length === 0) { showMessage("No one in the party is waiting for an order!", "orange"); return; }
        if (currentPreparation.length === 0) { showMessage("Prepare something first!", "orange"); return; }

        const prepSorted = [...currentPreparation].sort().join(','); // Sort for comparison
        let matchedCustomer = null;
        let dishAlreadyQueued = false;

        // Find the first waiting customer whose order matches the preparation
        // AND doesn't already have a dish queued for them.
        for (const customer of waitingCustomers) {
            if (customer.order && customer.order.ingredients) {
                const orderSorted = [...customer.order.ingredients].sort().join(',');
                if (prepSorted === orderSorted) {
                    // Check if a dish for this customer is ALREADY in the finished queue
                    const alreadyQueued = finishedDishes.some(dish => dish.customerId === customer.id);
                    // Also check if a dish for this customer is currently ANIMATING
                    const alreadyAnimating = [...animatingDishIds].some(animatingId => {
                        // Need to look up the customer ID associated with the animating dish ID.
                        // This requires the animating dish data, which isn't directly stored with the ID set.
                        // A more complex lookup would be needed. For simplicity, we'll rely on the `finishedDishes` check.
                        // If a dish starts animating, it's removed from finishedDishes.
                        // This check primarily prevents adding *another* identical dish while one is in the static queue.
                        return false; // Simplified - relies on check below
                    });


                    if (!alreadyQueued) {
                         matchedCustomer = customer;
                         break; // Found a valid match, stop searching
                    } else {
                        // A dish matching this prep exists, but it's already queued for this customer.
                        // Continue checking other customers who might also want this dish.
                        dishAlreadyQueued = true; // Remember that we found a match, but it was blocked
                        console.log(`Dish for Customer ${customer.seatNumber} already in queue.`);
                    }
                }
            }
        }


        if (matchedCustomer) {
            // Successfully matched the prep to a waiting customer who doesn't have it queued
            const dishInstanceId = generateUniqueId();
            const newFinishedDish = {
                id: dishInstanceId,
                recipe: matchedCustomer.order,
                customerId: matchedCustomer.id
            };

            finishedDishes.push(newFinishedDish); // Add to the logical queue
            addFinishedDishToDisplay(newFinishedDish); // Add visually (with tap/drag listener)

            currentPreparation = []; // Clear the prep area
            updatePrepDisplay();

            showMessage(`Dish for Customer ${matchedCustomer.seatNumber} added to queue!`, "blue");
        } else {
            // No suitable customer found for this preparation
             if(dishAlreadyQueued) {
                 // The dish was correct for *someone*, but they already have it queued.
                 showMessage("Dish prepared matches an order already in the queue!", "orange");
             } else {
                 // The preparation doesn't match any currently waiting order.
                 score -= 2; // Penalize incorrect prep
                 if (score < 0) score = 0; // Prevent negative score
                 updateScoreDisplay();
                 showMessage("Wrong ingredients for anyone waiting! (-2 points)", "red");
                 // Maybe flash the prep display red briefly?
                 prepDisplay.classList.add('prep-error-flash');
                 setTimeout(() => prepDisplay.classList.remove('prep-error-flash'), 500);
             }
             // Do not clear preparation on error, allow user to clear manually
        }
    }

    // --- Initial Event Listeners (for non-dynamic elements) ---
    finishPrepButton.addEventListener('click', handleFinishPrepClick);
    clearPrepButton.addEventListener('click', clearPreparation);

    // --- Start Game ---
    initGame();

}); // End DOMContentLoaded