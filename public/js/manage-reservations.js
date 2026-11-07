// Staff page for reservations (pages/manage-reservations.html): GET, POST, PUT and DELETE /api/reservations.
import { setupManager } from './crud.js';

setupManager({
  resource: 'reservations',
  singular: 'reservation',
  columns: [
    { field: 'name', label: 'Name' },
    { field: 'phone', label: 'Phone' },
    { field: 'date', label: 'Date' },
    { field: 'time', label: 'Time' },
    { field: 'guests', label: 'Guests' },
    { field: 'status', label: 'Status' },
    { field: 'notes', label: 'Notes' },
  ],
});
