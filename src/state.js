import { SHOPS } from './data/shops.js';

// Progress that lives across scenes: each shop's hearts, the Don's fish, where he stood.
// Saved in this browser so a reload keeps your turf.
const SAVE_KEY = 'cat-mafia-save';
const MAX_HEARTS = 3;

function load() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
  } catch {
    return {};
  }
}

const saved = load();

export const state = {
  hearts: Object.fromEntries(SHOPS.map((s) => [s.key, saved.hearts?.[s.key] ?? s.hearts])),
  fish: saved.fish ?? 0,
  donX: null,
};

export function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ hearts: state.hearts, fish: state.fish }));
  } catch {
    // Private mode or blocked storage: progress just won't stick.
  }
}

export function addHearts(key, n) {
  state.hearts[key] = Math.max(0, Math.min(MAX_HEARTS, state.hearts[key] + n));
  save();
}
