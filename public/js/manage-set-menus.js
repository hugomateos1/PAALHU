// Staff page for set menus (pages/manage-set-menus.html): GET, POST, PUT and DELETE /api/setMenus.
import { setupManager } from './crud.js';
import { euros, yesNo } from './forms.js';

setupManager({
  resource: 'setMenus',
  singular: 'set menu',
  columns: [
    { field: 'name', label: 'Name' },
    { field: 'price', label: 'Price', format: euros },
    { field: 'service', label: 'Service' },
    { field: 'weekdaysOnly', label: 'Weekdays only', format: yesNo },
    { field: 'active', label: 'Active', format: yesNo },
  ],
});
