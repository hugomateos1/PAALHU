// Form helpers shared by booking.js and crud.js (every staff page).
//
// How a form is written in the HTML, so these helpers can work with it:
//   <div class="field">
//     <label for="r-name">Name</label>
//     <input id="r-name" name="name" required minlength="3" maxlength="50"
//            data-message="Name is required and must have 3 to 50 characters.">
//     <span class="error" data-for="name"></span>
//   </div>
// - name           = the field name in the API body
// - required, min, max, minlength, pattern... = the client-side check (same rules as the validator)
// - data-message   = the text shown when the client-side check fails (same text as the server's)
// - <span class="error" data-for="..."> = where that field's errors appear
// - one <p class="form-message"> per form for messages that belong to no field (e.g. server down).

// Builds the request body from the form. Values are converted to the type the API expects:
// checkbox -> true/false, number input or data-type="number" -> number (null if empty),
// everything else -> trimmed text.
export function readForm(form) {
  const body = {};
  for (const input of form.elements) {
    if (!input.name) continue; // buttons and fieldsets have no name
    if (input.type === 'checkbox') {
      body[input.name] = input.checked;
    } else if (input.type === 'number' || input.dataset.type === 'number') {
      // data-type="number" is for a <select> whose options are numbers (a select always gives text).
      body[input.name] = input.value === '' ? null : Number(input.value);
    } else {
      body[input.name] = input.value.trim();
    }
  }
  return body;
}

// Puts an item's values back into the form (used by "Edit").
export function fillForm(form, item) {
  for (const input of form.elements) {
    if (!input.name || input.type === 'hidden') continue;
    if (input.type === 'checkbox') {
      input.checked = item[input.name] === true;
    } else {
      input.value = item[input.name] ?? '';
    }
  }
}

// Client-side check before sending: uses the HTML rules (required, min, max, pattern...).
// Returns a list of { field, message }, the same shape as the API's 400 answer.
export function checkForm(form) {
  const errors = [];
  for (const input of form.elements) {
    if (!input.name || input.checkValidity()) continue;
    errors.push({ field: input.name, message: input.dataset.message || input.validationMessage });
  }
  return errors;
}

// Shows each error under its own field. Errors without a matching field go to the form message.
export function showErrors(form, errors) {
  clearErrors(form);
  const general = [];
  for (const error of errors) {
    const span = error.field ? form.querySelector(`.error[data-for="${error.field}"]`) : null;
    if (span) {
      span.textContent = span.textContent ? `${span.textContent} ${error.message}` : error.message;
      form.elements[error.field]?.setAttribute('aria-invalid', 'true');
    } else {
      general.push(error.message);
    }
  }
  if (general.length > 0) showMessage(form, general.join(' '), 'bad');
  // Move the focus to the first field with an error, so keyboard users land on it.
  form.querySelector('[aria-invalid="true"]')?.focus();
}

export function clearErrors(form) {
  for (const span of form.querySelectorAll('.error')) span.textContent = '';
  for (const input of form.querySelectorAll('[aria-invalid]')) input.removeAttribute('aria-invalid');
  showMessage(form, '', '');
}

// The message under the form: kind 'ok' (green), 'bad' (red) or '' (hidden).
export function showMessage(form, text, kind) {
  const box = form.querySelector('.form-message');
  if (!box) return;
  box.textContent = text;
  box.className = kind ? `form-message ${kind}` : 'form-message';
}

// Display helpers for the lists.
export const euros = value => (typeof value === 'number' ? `€${value.toFixed(2)}` : '');
export const yesNo = value => (value ? 'Yes' : 'No');
