// --- Customer State & Lifecycle Functions ---

// Assumes global variables and functions from config.js, game.js, ui.js
// Assumes IS_MOBILE is defined in game.js

// Spawn a new party if the table is clear and no dishes are animating
function spawnNewParty() {
    if (currentParty || animatingDishIds.size > 0) {
        // console.log(`Cannot spawn party: Table occupied (${!!currentParty}) or dishes animating (${animatingDishIds.size})`);
        return;
    }

    const partySize = Math.floor(Math.random() * (MAX_PARTY_SIZE - MIN_PARTY_SIZE + 1)) + MIN_PARTY_SIZE;

    currentParty = {
        members: [],
        satisfaction: 0,
        targetSatisfaction: partySize
    };

    showMessage(`A party of ${partySize} is arriving!`, "blue");

    for (let i = 0; i < partySize; i++) {
        const customerId = 'cust_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
        const newCustomer = {
            id: customerId,
            seatNumber: i + 1,
            state: 'pondering', // Initial state
            order: null,
            ponderTimerId: null,
            eatingTimerId: null,
            eatingProgress: 0
        };
        currentParty.members.push(newCustomer);
        // Set timer for customer to decide their order
        const ponderTime = PONDER_TIME_MS_MIN + Math.random() * (PONDER_TIME_MS_MAX - PONDER_TIME_MS_MIN);
        newCustomer.ponderTimerId = setTimeout(() => handlePonderingComplete(customerId), ponderTime);
        activePonderTimers[customerId] = newCustomer.ponderTimerId; // Track timer
    }

    updateTableDisplay(); // Refresh table UI
    updateHungerMeterDisplay(); // Update party status UI
    updateCurrentOrdersDisplay(); // Update waiting orders list (will be empty initially)
}

// Called when a customer's pondering timer finishes
function handlePonderingComplete(customerId) {
    const customer = findCustomerById(customerId);
    if (customer && customer.state === 'pondering') {
        delete activePonderTimers[customerId]; // Stop tracking timer
        customer.order = RECIPES[Math.floor(Math.random() * RECIPES.length)]; // Assign random order
        customer.state = 'waiting'; // Change state
        customer.ponderTimerId = null;
        updateCustomerSeatDisplay(customerId); // Update individual seat UI
        updateCurrentOrdersDisplay(); // Update waiting orders list
    }
}

// Called when a customer receives their correct dish
function startEating(customerId) {
    const customer = findCustomerById(customerId);
    if (customer && customer.state === 'waiting') {
        customer.state = 'eating';
        customer.eatingProgress = 0;

        // Clear any existing eating timers for this customer (safety check)
        if (customer.eatingTimerId) clearInterval(customer.eatingTimerId);
        if (activeEatingTimers[customerId]) clearInterval(activeEatingTimers[customerId]);

        // Start new timer to simulate eating progress
        customer.eatingTimerId = setInterval(() => updateEatingProgress(customerId), EATING_UPDATE_INTERVAL_MS);
        activeEatingTimers[customerId] = customer.eatingTimerId; // Track timer

        updateCustomerSeatDisplay(customerId); // Update seat UI (shows fading dish)
        updateCurrentOrdersDisplay(); // Update waiting orders (customer removed)
    } else {
        console.warn(`Cannot start eating for customer ${customerId}, state is ${customer?.state} or customer not found.`);
    }
}

// Called periodically by the eating timer interval
function updateEatingProgress(customerId) {
    const customer = findCustomerById(customerId);
    if (customer && customer.state === 'eating') {
        // Calculate progress increment based on total eating time
        customer.eatingProgress += (100 / (EATING_TIME_MS / EATING_UPDATE_INTERVAL_MS));

        if (customer.eatingProgress >= 100) {
            customer.eatingProgress = 100; // Cap at 100%
            handleEatingComplete(customerId); // Eating finished
        } else {
            updateCustomerSeatDisplay(customerId); // Update visual (fade effect)
        }
    } else {
        // If customer somehow isn't eating anymore, clear the timer
        if(activeEatingTimers[customerId]) {
            clearInterval(activeEatingTimers[customerId]);
            delete activeEatingTimers[customerId];
        }
    }
}

// Called when eating progress reaches 100%
function handleEatingComplete(customerId) {
    const customer = findCustomerById(customerId);
    if (customer && customer.state === 'eating') {

        // Clear and stop tracking the eating timer
        if (customer.eatingTimerId) clearInterval(customer.eatingTimerId);
        delete activeEatingTimers[customerId];
        customer.eatingTimerId = null;

        customer.state = 'finished'; // Change state
        updateCustomerSeatDisplay(customerId); // Update seat UI (shows satisfied state)

        if (currentParty) {
             currentParty.satisfaction++; // Increment party satisfaction
             updateHungerMeterDisplay(); // Update party UI
             showMessage(`Customer ${customer.seatNumber} finished! Satisfaction: ${currentParty.satisfaction}/${currentParty.targetSatisfaction}`, "black");
             checkPartyCompletion(); // See if the whole party is done
        }
    }
}

// Utility to find a customer object by their ID within the current party
function findCustomerById(customerId) {
    if (!currentParty || !currentParty.members) return null;
    return currentParty.members.find(cust => cust.id === customerId);
}