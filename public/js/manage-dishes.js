// Staff page for dishes, the main resource (pages/manage-dishes.html): GET, POST, PUT and DELETE /api/dishes.
import { setupManager } from './crud.js';
import { euros, yesNo } from './forms.js';

// Same symbols as the spice guide: 🍃 for 0, otherwise one 🌶️ per level.
const spice = level => (level === 0 ? '🍃' : '🌶️'.repeat(level));

setupManager({
  resource: 'dishes',
  singular: 'dish',
  columns: [
    { field: 'name', label: 'Name' },
    { field: 'category', label: 'Category' },
    { field: 'price', label: 'Price', format: euros },
    { field: 'spiceLevel', label: 'Spice', format: spice },
    { field: 'vegetarian', label: 'Vegetarian', format: yesNo },
    { field: 'available', label: 'Available', format: yesNo },
  ],
});
