// scratch/test_farm_persistence.js
// Verification script for Farm State persistence with 0 graduated Pokemon

import assert from 'assert';
import { upsertFarm, getFarm } from '../server/src/db.js';

// 1. Mock LocalStorage
const localStorageMock = (function () {
  let store = {};
  return {
    getItem: function (key) {
      return store[key] || null;
    },
    setItem: function (key, value) {
      store[key] = value.toString();
    },
    removeItem: function (key) {
      delete store[key];
    },
    clear: function () {
      store = {};
    },
    key: function (i) {
      return Object.keys(store)[i] || null;
    },
    get length() {
      return Object.keys(store).length;
    }
  };
})();

globalThis.localStorage = localStorageMock;

// 2. Logic to test
const FARM_STORAGE_KEY = 'pokefarm_save_data';
const FARM_CURRENT_SAVE_KEY = 'pokefarm_save_data_current_active';

function isValidFarmSave(state) {
  if (!state || typeof state !== 'object') return false;
  return !!(
    state.isInitialized ||
    state.activePokemon ||
    (state.graduatedPokemon && state.graduatedPokemon.length > 0) ||
    (state.ownerName && state.ownerName !== '지우' && state.ownerName.trim().length > 0)
  );
}

function saveFarmState(state) {
  if (!state || !isValidFarmSave(state)) return;
  const jsonStr = JSON.stringify(state);
  localStorage.setItem(FARM_CURRENT_SAVE_KEY, jsonStr);
  if (state.ownerName) {
    localStorage.setItem(`${FARM_STORAGE_KEY}_${state.ownerName}`, jsonStr);
    localStorage.setItem('pokefarm_saved_owner', state.ownerName);
  }
}

function loadFarmState(ownerName) {
  let parsed = null;

  if (ownerName && ownerName.trim()) {
    const ownerKey = `${FARM_STORAGE_KEY}_${ownerName.trim()}`;
    const ownerRaw = localStorage.getItem(ownerKey);
    if (ownerRaw) {
      try {
        const candidate = JSON.parse(ownerRaw);
        if (isValidFarmSave(candidate)) parsed = candidate;
      } catch (e) {}
    }
  }

  if (!parsed) {
    const currentActiveRaw = localStorage.getItem(FARM_CURRENT_SAVE_KEY);
    if (currentActiveRaw) {
      try {
        const candidate = JSON.parse(currentActiveRaw);
        if (isValidFarmSave(candidate)) parsed = candidate;
      } catch (e) {}
    }
  }

  if (parsed && isValidFarmSave(parsed)) {
    parsed.isInitialized = true;
    return parsed;
  }

  return {
    ownerName: ownerName || '지우',
    isInitialized: false,
    activePokemon: null,
    graduatedPokemon: []
  };
}

console.log('--- Test 1: New user establishes farm with 0 graduated pokemon ---');
const newFarm = {
  ownerName: '송디니',
  farmName: '송디니의 포켓농장',
  isInitialized: true,
  activePokemon: {
    speciesId: 25,
    name: '피카츄',
    level: 1,
    exp: 0,
    maxExp: 100
  },
  graduatedPokemon: [] // 0 graduated pokemon!
};

saveFarmState(newFarm);
console.log('Saved farm to localStorage.');

const loadedFarm = loadFarmState('송디니');
assert.strictEqual(loadedFarm.isInitialized, true, 'Farm must be initialized');
assert.strictEqual(loadedFarm.ownerName, '송디니', 'Owner name must match');
assert.strictEqual(loadedFarm.activePokemon.name, '피카츄', 'Active pokemon must match');
assert.strictEqual(loadedFarm.graduatedPokemon.length, 0, 'Graduated pokemon is 0');
console.log('[PASS] Test 1: New farm loaded with isInitialized = true, 0 graduated pokemon!');

console.log('--- Test 2: Refreshing browser with loaded state ---');
const reloaded = loadFarmState();
assert.strictEqual(reloaded.isInitialized, true, 'Farm must be initialized on browser reload');
assert.strictEqual(reloaded.ownerName, '송디니');
console.log('[PASS] Test 2: Browser reload preserves farm without prompting onboarding!');

console.log('--- Test 3: Testing SQLite DB Integration ---');

const dbSaved = upsertFarm('송디니', newFarm);
assert(dbSaved, 'DB farm must be saved');
assert.strictEqual(dbSaved.username, '송디니');
assert.strictEqual(dbSaved.activePokemon.name, '피카츄');
assert.strictEqual(dbSaved.graduatedPokemon.length, 0);

const dbFetched = getFarm('송디니');
assert(dbFetched, 'DB fetched farm must exist');
assert.strictEqual(dbFetched.activePokemon.name, '피카츄');
assert.strictEqual(dbFetched.isInitialized, true);
console.log('[PASS] Test 3: SQLite DB persists and returns farm with 0 graduated pokemon perfectly!');

console.log('\nAll persistence and database tests passed 100%!');
