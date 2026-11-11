// Menu page (pages/menu.html): lists the dishes and drinks from the API, with filters.
//
// Every filter change asks the API again with a query string, so the filtering happens on the server:
//   GET /api/dishes?search=&category=&spiceLevel=&vegetarian=true&available=true
//   GET /api/drinks?search=
// The "Show spice level" checkbox is not a filter: it only hides the spice symbols with CSS.
import { apiRequest } from './api.js';

// The menu sections, in order. Keys copy CATEGORIES in src/validators/dishesValidator.js.
const SECTIONS = [
  { key: 'starters', title: 'Starters' },
  { key: 'curries', title: 'Curries and main dishes' },
  { key: 'vegetarian', title: 'Vegetarian and vegan dishes' },
  { key: 'rice', title: 'Rice' },
  { key: 'breads', title: 'Breads' },
  { key: 'desserts', title: 'Desserts' },
];
// Same names and symbols as the spice guide: 🍃 for 0, otherwise one 🌶️ per level.
const SPICE_NAMES = ['Not spicy', 'Very mild', 'Mild', 'Medium', 'Hot', 'Very hot'];
const spiceSymbols = level => (level === 0 ? '🍃' : '🌶️'.repeat(level));
const euros = price => `€${price.toFixed(2)}`;

const form = document.getElementById('menu-filters');
const status = document.getElementById('menu-status');
const results = document.getElementById('menu-results');
const spiceToggle = document.getElementById('t-spice');

// Each load gets a number; an answer that arrives after a newer request is ignored,
// so typing fast in the search box never shows an old result.
let lastRequest = 0;

function showStatus(text, kind) {
  status.textContent = text;
  status.className = kind ? `status ${kind}` : 'status';
  status.hidden = text === '';
}

// Turns { search: 'naan', spiceLevel: '' } into "?search=naan" (empty values are left out).
function queryString(params) {
  const qs = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== '' && val !== undefined) qs.set(key, val);
  }
  const text = qs.toString();
  return text ? `?${text}` : '';
}

function readFilters() {
  return {
    search: form.search.value.trim(),
    show: form.show.value,                 // '' = everything, a category, or 'drinks'
    spiceLevel: form.spiceLevel.value,    // '' = any level, or '0' to '5'
    vegetarian: form.vegetarian.checked,
  };
}

function dishItem(dish) {
  const li = document.createElement('li');
  li.append(`${dish.name} — ${euros(dish.price)} `);
  const spice = document.createElement('span');
  spice.className = 'spice';
  spice.title = dish.spiceLevel === 0 ? SPICE_NAMES[0] : `Spice level ${dish.spiceLevel}: ${SPICE_NAMES[dish.spiceLevel]}`;
  spice.textContent = spiceSymbols(dish.spiceLevel);
  li.append(spice);
  return li;
}

function drinkItem(drink) {
  const li = document.createElement('li');
  li.textContent = `${drink.name} — ${euros(drink.price)}`;
  return li;
}

function section(title, items) {
  const h2 = document.createElement('h2');
  h2.textContent = title;
  const ul = document.createElement('ul');
  ul.className = 'dish-list';
  ul.replaceChildren(...items);
  return [h2, ul];
}

async function loadMenu() {
  const f = readFilters();
  const onlyDrinks = f.show === 'drinks';

  // Spice level and "vegetarian only" don't apply to drinks.
  form.spiceLevel.disabled = onlyDrinks;
  form.vegetarian.disabled = onlyDrinks;

  // Drinks are shown with "Everything" or "Drinks", unless a dish-only filter is on.
  const wantDishes = !onlyDrinks;
  const wantDrinks = onlyDrinks || (f.show === '' && f.spiceLevel === '' && !f.vegetarian);

  const dishQuery = queryString({
    search: f.search,
    category: onlyDrinks ? '' : f.show,
    spiceLevel: onlyDrinks ? '' : f.spiceLevel,
    vegetarian: f.vegetarian ? 'true' : '',
    available: 'true',                     // dishes not served today are not on the menu
  });
  const drinkQuery = queryString({ search: f.search });

  const request = ++lastRequest;
  showStatus('Loading the menu…', 'loading');

  const [dishes, drinks] = await Promise.all([
    wantDishes ? apiRequest('GET', `/dishes${dishQuery}`) : { ok: true, data: [] },
    wantDrinks ? apiRequest('GET', `/drinks${drinkQuery}`) : { ok: true, data: [] },
  ]);
  if (request !== lastRequest) return;     // a newer filter change is already loading

  const failed = [dishes, drinks].find(r => !r.ok);
  if (failed) {
    results.replaceChildren();
    showStatus(`The menu could not be loaded: ${failed.errors.map(e => e.message).join(' ')}`, 'bad');
    return;
  }

  const nodes = [];
  for (const { key, title } of SECTIONS) {
    const inSection = dishes.data.filter(dish => dish.category === key);
    if (inSection.length > 0) nodes.push(...section(title, inSection.map(dishItem)));
  }
  if (drinks.data.length > 0) nodes.push(...section('Drinks', drinks.data.map(drinkItem)));

  results.replaceChildren(...nodes);
  if (nodes.length === 0) {
    showStatus('Nothing on the menu matches these filters. Try clearing some of them.', 'empty');
  } else {
    showStatus('');
  }
}

// Search: wait until the user stops typing for a moment, so there is not one request per key.
let searchTimer;
form.search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadMenu, 300);
});
// Every other filter: ask again straight away.
for (const name of ['show', 'spiceLevel', 'vegetarian']) {
  form[name].addEventListener('change', loadMenu);
}
form.addEventListener('submit', event => {
  event.preventDefault();                  // Enter in the search box must not reload the page
  loadMenu();
});
// "Clear filters": the form resets its fields first, then the menu is loaded again.
form.addEventListener('reset', () => {
  setTimeout(() => {
    applySpiceToggle();
    loadMenu();
  });
});

// "Show spice level": only a CSS class, no request.
function applySpiceToggle() {
  results.classList.toggle('hide-spice', !spiceToggle.checked);
}
spiceToggle.addEventListener('change', applySpiceToggle);

// Start with every filter empty: "Everything" and "Any level" (the browser may have kept old
// values from the last visit). Resetting fires the "reset" listener above, which loads the menu.
form.reset();
