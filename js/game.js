// --- Global Game State Variables ---
let score = 0;
let currentParty = null;
let currentPreparation = [];
let finishedDishes = []; // Queue of { id, recipe } -- customerId removed here initially
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

    // Handles clicking the "Finish Prep" button - REVISED LOGIC
    function handleFinishPrepClick() {
        // Basic checks
        if (currentPreparation.length === 0) { showMessage("Prepare something first!", "orange"); return; }
        // Allow prep even if no party is present or waiting
        // if (!currentParty || currentParty.members.length === 0) { showMessage("No party at the table!", "orange"); return; }
    
        const prepIngredients = [...currentPreparation]; // Keep the original order for visual later if needed
        const prepSorted = [...currentPreparation].sort().join(',');
        let matchedRecipe = null;
        let dishRecipeObject = null; // This will hold the object to be added to the queue
    
        // Check against ALL known recipes
        for (const recipe of RECIPES) {
            const recipeIngredientsSorted = [...recipe.ingredients].sort().join(',');
            if (prepSorted === recipeIngredientsSorted) {
                matchedRecipe = recipe;
                break;
            }
        }
    
        const dishInstanceId = generateUniqueId();
    
        if (matchedRecipe) {
            // Valid recipe prepared
            dishRecipeObject = matchedRecipe; // Use the actual recipe object
            showMessage(`Prepared ${dishRecipeObject.name}! Added to queue.`, "blue");
        } else {
            // Invalid ingredient combination - Create an "Unknown Dish" object
            const visualString = prepIngredients.map(name => INGREDIENTS[name] || '?').join(' '); // Get visuals of ingredients used
            dishRecipeObject = {
                name: "Unknown Dish",
                ingredients: prepIngredients, // Store the actual ingredients used
                visual: `❓ ${visualString}` // Mark as unknown + show ingredients
            };
            showMessage(`Prepared an Unknown Dish! Added to queue.`, "orange"); // Use warning color
            // No immediate penalty here anymore
        }
    
        // Add the dish (either valid recipe or unknown) to the queue
        const newFinishedDish = {
            id: dishInstanceId,
            recipe: dishRecipeObject // Contains name, ingredients, visual
        };
    
        finishedDishes.push(newFinishedDish); // Add to the logical queue
        addFinishedDishToDisplay(newFinishedDish); // Add visually & updates button state
    
        currentPreparation = []; // Clear the prep area
        updatePrepDisplay();
        prepDisplay.classList.remove('prep-error-flash'); // Ensure no error flash lingers
    
    }


    // --- Initial Event Listeners (for non-dynamic elements) ---
    finishPrepButton.addEventListener('click', handleFinishPrepClick);
    clearPrepButton.addEventListener('click', clearPreparation);
    deliverFoodButton.addEventListener('click', handleDeliverFoodClick); // ADD listener for new button
    deliverAllButton.addEventListener('click', handleDeliverAllClick);
    // --- Start Game ---
    initGame();

}); // End DOMContentLoaded