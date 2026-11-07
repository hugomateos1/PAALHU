// Booking page (pages/booking.html): a customer books a table with POST /api/reservations.
import { apiRequest } from './api.js';
import { readForm, checkForm, showErrors, clearErrors, showMessage } from './forms.js';

const form = document.getElementById('booking-form');
const submitButton = form.querySelector('button[type="submit"]');

// No bookings in the past: the earliest day is today (local date, not UTC).
// The API itself accepts any real date, because staff may also record past bookings.
const now = new Date();
const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
form.elements.date.min = today;

form.addEventListener('submit', async event => {
  event.preventDefault();
  const body = readForm(form);

  const errors = checkForm(form);
  if (errors.length > 0) {
    showErrors(form, errors);
    return;
  }

  clearErrors(form);
  submitButton.disabled = true;
  showMessage(form, 'Sending your booking…', '');
  const result = await apiRequest('POST', '/reservations', body);
  submitButton.disabled = false;

  if (!result.ok) {
    showErrors(form, result.errors);
    return;
  }

  const booking = result.data;
  const people = booking.guests === 1 ? '1 person' : `${booking.guests} people`;
  form.reset();
  showMessage(form,
    `Thank you, ${booking.name}! Your table for ${people} on ${booking.date} at ${booking.time} is booked. ` +
    `Booking number: ${booking.id}.`, 'ok');
});
