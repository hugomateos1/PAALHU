// Staff page for drinks (pages/manage-drinks.html): GET, POST, PUT and DELETE /api/drinks.
import { setupManager } from './crud.js';
import { euros, yesNo } from './forms.js';

setupManager({
  resource: 'drinks',
  singular: 'drink',
  columns: [
    { field: 'name', label: 'Name' },
    { field: 'type', label: 'Type' },
    { field: 'price', label: 'Price', format: euros },
    { field: 'alcoholic', label: 'Alcoholic', format: yesNo },
  ],
});
