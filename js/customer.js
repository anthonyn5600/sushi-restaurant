// --- Customer State & Lifecycle Functions ---

// Assumes global variables and functions from config.js, game.js, ui.js

// UPDATED: Replaced isAnimating check with animatingDishIds.size check
function spawnNewParty() {
    // Only spawn if the table is currently empty AND no dishes are currently animating
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
        // Use a different prefix for customer IDs to ensure no collision with dish IDs
        const customerId = 'cust_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
        const newCustomer = {
            id: customerId,
            seatNumber: i + 1,
            state: 'pondering',
            order: null,
            ponderTimerId: null,
            eatingTimerId: null,
            eatingProgress: 0
        };
        currentParty.members.push(newCustomer);
        const ponderTime = PONDER_TIME_MS_MIN + Math.random() * (PONDER_TIME_MS_MAX - PONDER_TIME_MS_MIN);
        newCustomer.ponderTimerId = setTimeout(() => handlePonderingComplete(customerId), ponderTime);
        activePonderTimers[customerId] = newCustomer.ponderTimerId;
    }

    updateTableDisplay();
    updateHungerMeterDisplay();
    updateCurrentOrdersDisplay(); // Update waiting orders display when party arrives
}

// --- Other functions remain the same ---

function handlePonderingComplete(customerId) {
    const customer = findCustomerById(customerId);
    if (customer && customer.state === 'pondering') {
        delete activePonderTimers[customerId];
        customer.order = RECIPES[Math.floor(Math.random() * RECIPES.length)];
        customer.state = 'waiting';
        customer.ponderTimerId = null;
        updateCustomerSeatDisplay(customerId);
        updateCurrentOrdersDisplay(); // Update waiting orders when someone decides
    }
}

function startEating(customerId) {
    const customer = findCustomerById(customerId);
    if (customer && customer.state === 'waiting') {
        customer.state = 'eating';
        customer.eatingProgress = 0;

        if (customer.eatingTimerId) clearInterval(customer.eatingTimerId);
        if (activeEatingTimers[customerId]) clearInterval(activeEatingTimers[customerId]);

        customer.eatingTimerId = setInterval(() => updateEatingProgress(customerId), EATING_UPDATE_INTERVAL_MS);
        activeEatingTimers[customerId] = customer.eatingTimerId;

        updateCustomerSeatDisplay(customerId);
        updateCurrentOrdersDisplay(); // Update waiting orders when someone starts eating
    } else {
        console.warn(`Cannot start eating for customer ${customerId}, state is ${customer?.state} or customer not found.`);
    }
}

function updateEatingProgress(customerId) {
    const customer = findCustomerById(customerId);
    if (customer && customer.state === 'eating') {
        customer.eatingProgress += (100 / (EATING_TIME_MS / EATING_UPDATE_INTERVAL_MS));

        if (customer.eatingProgress >= 100) {
            customer.eatingProgress = 100;
            handleEatingComplete(customerId);
        } else {
            updateCustomerSeatDisplay(customerId);
        }
    } else {
        if(activeEatingTimers[customerId]) {
            clearInterval(activeEatingTimers[customerId]);
            delete activeEatingTimers[customerId];
        }
    }
}

function handleEatingComplete(customerId) {
    const customer = findCustomerById(customerId);
    if (customer && customer.state === 'eating') {

        if (customer.eatingTimerId) clearInterval(customer.eatingTimerId);
        delete activeEatingTimers[customerId];

        customer.state = 'finished';
        updateCustomerSeatDisplay(customerId);
        // Don't need to update waiting orders here, as they are already not waiting

        if (currentParty) {
             currentParty.satisfaction++;
             updateHungerMeterDisplay();
             showMessage(`Customer ${customer.seatNumber} finished! Satisfaction: ${currentParty.satisfaction}/${currentParty.targetSatisfaction}`, "black");
             checkPartyCompletion(); // Check if party is done
        }
    }
}

// Find customer within the current party
function findCustomerById(customerId) {
    if (!currentParty || !currentParty.members) return null;
    return currentParty.members.find(cust => cust.id === customerId);
}