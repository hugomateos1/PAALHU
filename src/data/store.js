// In-memory store: the ONLY file that touches the data. Controllers call these functions,
// never the arrays. A real database could later replace this file without changing the controllers.
// The data lives in memory, so it goes back to the seed data every time the server restarts.

// ---------- seed data ----------
// Dishes from the menu (public/pages/menu.html).
// spiceLevel uses the same scale as the spice guide (public/pages/spice_guide.html):
//   0 = not spicy (🍃) · 1 very mild (🌶️) · 2 mild · 3 medium · 4 hot · 5 very hot (🌶️🌶️🌶️🌶️🌶️)
// The menu and set menu pages show the same level next to each dish: keep them in sync.
const data = {
  dishes: [
    { id: 1,  name: 'Vegetable samosa',      category: 'starters',   price: 4.90,  spiceLevel: 1, vegetarian: true,  available: true },
    { id: 2,  name: 'Onion bhaji',           category: 'starters',   price: 4.90,  spiceLevel: 1, vegetarian: true,  available: true },
    { id: 3,  name: 'Chicken pakora',        category: 'starters',   price: 5.90,  spiceLevel: 1, vegetarian: false, available: true },
    { id: 4,  name: 'Papadum with chutneys', category: 'starters',   price: 3.50,  spiceLevel: 0, vegetarian: true,  available: true },
    { id: 5,  name: 'Chicken tikka',         category: 'starters',   price: 6.90,  spiceLevel: 2, vegetarian: false, available: true },
    { id: 6,  name: 'Chicken tikka masala',  category: 'curries',    price: 12.90, spiceLevel: 2, vegetarian: false, available: true },
    { id: 7,  name: 'Chicken korma',         category: 'curries',    price: 12.50, spiceLevel: 1, vegetarian: false, available: true },
    { id: 8,  name: 'Madras curry',          category: 'curries',    price: 12.90, spiceLevel: 4, vegetarian: false, available: true },
    { id: 9,  name: 'Vindaloo',              category: 'curries',    price: 13.50, spiceLevel: 5, vegetarian: false, available: true },
    { id: 10, name: 'Lamb rogan josh',       category: 'curries',    price: 14.90, spiceLevel: 3, vegetarian: false, available: true },
    { id: 11, name: 'Butter chicken',        category: 'curries',    price: 12.90, spiceLevel: 1, vegetarian: false, available: true },
    { id: 12, name: 'Prawn biryani',         category: 'curries',    price: 14.50, spiceLevel: 2, vegetarian: false, available: true },
    { id: 13, name: 'Palak paneer',          category: 'vegetarian', price: 11.50, spiceLevel: 1, vegetarian: true,  available: true },
    { id: 14, name: 'Chana masala',          category: 'vegetarian', price: 10.50, spiceLevel: 2, vegetarian: true,  available: true },
    { id: 15, name: 'Dal tadka',             category: 'vegetarian', price: 10.50, spiceLevel: 1, vegetarian: true,  available: true },
    { id: 16, name: 'Vegetable korma',       category: 'vegetarian', price: 11.50, spiceLevel: 1, vegetarian: true,  available: true },
    { id: 17, name: 'Basmati rice',          category: 'rice',       price: 2.90,  spiceLevel: 0, vegetarian: true,  available: true },
    { id: 18, name: 'Pilau rice',            category: 'rice',       price: 3.50,  spiceLevel: 0, vegetarian: true,  available: true },
    { id: 19, name: 'Jeera rice',            category: 'rice',       price: 3.50,  spiceLevel: 0, vegetarian: true,  available: true },
    { id: 20, name: 'Vegetable biryani',     category: 'rice',       price: 9.90,  spiceLevel: 2, vegetarian: true,  available: true },
    { id: 21, name: 'Plain naan',            category: 'breads',     price: 2.50,  spiceLevel: 0, vegetarian: true,  available: true },
    { id: 22, name: 'Garlic naan',           category: 'breads',     price: 3.00,  spiceLevel: 0, vegetarian: true,  available: true },
    { id: 23, name: 'Cheese naan',           category: 'breads',     price: 3.50,  spiceLevel: 0, vegetarian: true,  available: true },
    { id: 24, name: 'Peshwari naan',         category: 'breads',     price: 3.50,  spiceLevel: 0, vegetarian: true,  available: true },
    { id: 25, name: 'Tandoori roti',         category: 'breads',     price: 2.00,  spiceLevel: 0, vegetarian: true,  available: true },
    { id: 26, name: 'Paratha',               category: 'breads',     price: 3.00,  spiceLevel: 0, vegetarian: true,  available: true },
    { id: 27, name: 'Gulab jamun',           category: 'desserts',   price: 4.50,  spiceLevel: 0, vegetarian: true,  available: true },
    { id: 28, name: 'Rasmalai',              category: 'desserts',   price: 4.90,  spiceLevel: 0, vegetarian: true,  available: true },
    { id: 29, name: 'Gajar halwa',           category: 'desserts',   price: 4.50,  spiceLevel: 0, vegetarian: true,  available: true },
  ],

  // Drinks from the menu.
  drinks: [
    { id: 1, name: 'Mango lassi',     type: 'lassi',      price: 3.50, alcoholic: false },
    { id: 2, name: 'Sweet lassi',     type: 'lassi',      price: 3.00, alcoholic: false },
    { id: 3, name: 'Salted lassi',    type: 'lassi',      price: 3.00, alcoholic: false },
    { id: 4, name: 'Masala chai',     type: 'tea',        price: 2.50, alcoholic: false },
    { id: 5, name: 'Fresh lime soda', type: 'soft-drink', price: 3.00, alcoholic: false },
  ],

  // The set menu (public/pages/set-menu.html).
  setMenus: [
    { id: 1, name: 'Set menu', price: 12.90, service: 'lunch', weekdaysOnly: true, active: true },
  ],

  // The restaurant's 13 tables (same as .claude/skills/paalhu-reservas/config.json).
  tables: [
    { id: 1,  code: 'M1',  seats: 2, joinable: true, active: true },
    { id: 2,  code: 'M2',  seats: 2, joinable: true, active: true },
    { id: 3,  code: 'M3',  seats: 2, joinable: true, active: true },
    { id: 4,  code: 'M4',  seats: 2, joinable: true, active: true },
    { id: 5,  code: 'M5',  seats: 2, joinable: true, active: true },
    { id: 6,  code: 'M6',  seats: 2, joinable: true, active: true },
    { id: 7,  code: 'M7',  seats: 4, joinable: true, active: true },
    { id: 8,  code: 'M8',  seats: 4, joinable: true, active: true },
    { id: 9,  code: 'M9',  seats: 4, joinable: true, active: true },
    { id: 10, code: 'M10', seats: 4, joinable: true, active: true },
    { id: 11, code: 'M11', seats: 4, joinable: true, active: true },
    { id: 12, code: 'M12', seats: 4, joinable: true, active: true },
    { id: 13, code: 'M13', seats: 4, joinable: true, active: true },
  ],

  // Example rows (made-up people) so the lists aren't empty when testing.
  customers: [
    { id: 1, name: 'Ana López',    email: 'ana.lopez@example.com',    phone: '600111222', newsletter: true },
    { id: 2, name: 'Marco Rossi',  email: 'marco.rossi@example.com',  phone: '600333444', newsletter: false },
    { id: 3, name: 'Lucía Martín', email: 'lucia.martin@example.com', phone: '600555666', newsletter: true },
  ],

  reservations: [
    { id: 1, name: 'Ana López',   phone: '600111222', date: '2026-11-20', time: '21:00', guests: 4, status: 'confirmed', notes: 'One guest is allergic to nuts.' },
    { id: 2, name: 'Marco Rossi', phone: '600333444', date: '2026-11-21', time: '14:00', guests: 2, status: 'confirmed', notes: '' },
    { id: 3, name: 'Pedro Gil',   phone: '600777888', date: '2026-11-02', time: '20:30', guests: 6, status: 'no-show',   notes: '' },
  ],

  orders: [
    { id: 1, name: 'Lucía Martín', phone: '600555666', type: 'delivery', address: 'Calle de Pirineos 20, 3ºB, Madrid', total: 28.30, status: 'delivered' },
    { id: 2, name: 'Marco Rossi',  phone: '600333444', type: 'takeaway', address: '',                                  total: 17.40, status: 'ready' },
  ],

  reviews: [
    { id: 1, author: 'Ana L.',   rating: 5, comment: 'The best butter chicken in Madrid. Lovely family.',      published: true },
    { id: 2, author: 'Marco R.', rating: 4, comment: 'Great naan and quick takeaway. A bit noisy on Fridays.', published: true },
    { id: 3, author: 'Guest',    rating: 2, comment: 'Waited too long for our table.',                         published: false },
  ],
};

// The next id for each resource: one more than the highest id in the seed data.
const nextId = {
  dishes: 30,
  drinks: 6,
  setMenus: 2,
  tables: 14,
  customers: 4,
  reservations: 4,
  orders: 3,
  reviews: 4,
};

// ---------- functions ----------
// `resource` is the name of the list, e.g. 'dishes'.

// All items (a copy, so nobody can change the stored list from outside).
export function getAll(resource) {
  return [...data[resource]];
}

// One item by id, or undefined if there is none.
export function getById(resource, id) {
  return data[resource].find(item => item.id === id);
}

// Adds a new item. The server gives the id, never the client.
export function create(resource, fields) {
  const item = { id: nextId[resource], ...fields };
  nextId[resource] = nextId[resource] + 1;
  data[resource].push(item);
  return item;
}

// Replaces every field of an item (PUT). Returns the new item, or undefined if the id doesn't exist.
export function update(resource, id, fields) {
  const index = data[resource].findIndex(item => item.id === id);
  if (index === -1) return undefined;
  const item = { id, ...fields };
  data[resource][index] = item;
  return item;
}

// Deletes an item. Returns true if it was deleted, false if the id doesn't exist.
export function remove(resource, id) {
  const index = data[resource].findIndex(item => item.id === id);
  if (index === -1) return false;
  data[resource].splice(index, 1);
  return true;
}
