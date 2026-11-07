// Staff page for orders (pages/manage-orders.html): GET, POST, PUT and DELETE /api/orders.
import { setupManager } from './crud.js';
import { euros } from './forms.js';

setupManager({
  resource: 'orders',
  singular: 'order',
  columns: [
    { field: 'name', label: 'Name' },
    { field: 'phone', label: 'Phone' },
    { field: 'type', label: 'Type' },
    { field: 'address', label: 'Address', format: (value, order) => (order.type === 'delivery' ? value : '—') },
    { field: 'total', label: 'Total', format: euros },
    { field: 'status', label: 'Status' },
  ],
  // The one rule HTML attributes cannot express: the address is required only for delivery
  // (same rule as ordersValidator.js).
  check: body => (body.type === 'delivery' && body.address === ''
    ? [{ field: 'address', message: 'A delivery order needs an address (at most 200 characters).' }]
    : []),
});
