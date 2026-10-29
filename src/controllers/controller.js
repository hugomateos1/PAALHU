// PAALHU website controllers: one function per endpoint of the menu, login and booking screens.
// Each function reads the request, checks it, uses the data and sends the answer.

// ---------- data ----------
// Dish categories, in the order the menu shows them (same as pages/menu.html).
const categories = [
  { id: 1, name: 'Starters', order: 1 },
  { id: 2, name: 'Curries and main dishes', order: 2 },
  { id: 3, name: 'Vegetarian and vegan dishes', order: 3 },
  { id: 4, name: 'Rice', order: 4 },
  { id: 5, name: 'Breads', order: 5 },
  { id: 6, name: 'Desserts', order: 6 },
];

// ---------- menu screen ----------
// GET /api/categories: the short, fixed list for the menu filter. No paging.
export function getCategories(req, res) {
  res.json([...categories].sort((a, b) => a.order - b.order));
}
