// --- Game Configuration & Constants ---

const INGREDIENTS = {
    'rice': '🍚', 'nori': '📗', 'salmon': '🍣', 'tuna': '🐟', 'avocado': '🥑', 'cucumber': '🥒', 'crab': '🦀'
};

const RECIPES = [
    { name: "Salmon Nigiri", ingredients: ['rice', 'salmon'], visual: '🍣' },
    { name: "Tuna Nigiri", ingredients: ['rice', 'tuna'], visual: '🐟' },
    { name: "Cucumber Roll", ingredients: ['rice', 'nori', 'cucumber'], visual: '🥒📗' },
    { name: "Avocado Roll", ingredients: ['rice', 'nori', 'avocado'], visual: '🥑📗' },
    { name: "California Roll", ingredients: ['rice', 'nori', 'crab', 'avocado', 'cucumber'], visual: '🦀🥑🥒📗' }
];

// const TABLE_CAPACITY = 6; // REMOVED - No longer the primary limit for arrival
const MAX_PARTY_SIZE = 4;    // NEW - Maximum customers per party
const MIN_PARTY_SIZE = 1;    // NEW - Minimum customers per party (can be 1)

// const CUSTOMER_SPAWN_RATE_MS = 4000; // REMOVED - Parties spawn sequentially now
const PONDER_TIME_MS_MIN = 1500; // Min time customer thinks
const PONDER_TIME_MS_MAX = 3500; // Max time customer thinks
const EATING_TIME_MS = 5000; // Total time to eat a dish
const EATING_UPDATE_INTERVAL_MS = 100; // How often to update eating progress visual
const PARTY_LEAVE_DELAY_MS = 2000; // NEW - Delay before new party arrives after completion

// NOTE: Since we are not using JS modules, these constants will be available globally
// after this script is loaded in the HTML.