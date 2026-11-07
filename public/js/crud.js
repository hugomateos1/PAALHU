// Staff pages: one form + one list for a resource, with create (POST), edit (PUT) and delete (DELETE).
// Every manage-*.js only describes its resource and calls setupManager; the work is done here.
//
//   setupManager({
//     resource: 'drinks',                       // -> /api/drinks
//     singular: 'drink',                        // used in messages
//     columns: [{ field: 'name', label: 'Name' }, { field: 'price', label: 'Price', format: euros }],
//     check: body => [...],                     // optional extra client-side checks, returns [{ field, message }]
//   });
//
// The page must contain #item-form, #list-status and #list (see manage-drinks.html).
// The list is always drawn from the API answer: nothing is typed into the HTML.
import { apiRequest } from './api.js';
import { readForm, fillForm, checkForm, showErrors, clearErrors, showMessage } from './forms.js';

export function setupManager({ resource, singular, columns, check = () => [] }) {
  const form = document.getElementById('item-form');
  const formTitle = document.getElementById('form-title');
  const submitButton = form.querySelector('button[type="submit"]');
  const cancelButton = form.querySelector('.cancel-edit');
  const status = document.getElementById('list-status');
  const list = document.getElementById('list');

  const createTitle = formTitle.textContent;
  const createLabel = submitButton.textContent;
  let editingId = null; // null = the form creates; a number = the form edits that item

  // ---------- list ----------
  async function loadList() {
    setStatus('Loading…', 'loading');
    const result = await apiRequest('GET', `/${resource}`);
    if (!result.ok) {
      list.replaceChildren();
      setStatus(`Could not load the list: ${result.errors.map(e => e.message).join(' ')}`, 'bad');
      return;
    }
    if (result.data.length === 0) {
      list.replaceChildren();
      setStatus(`There are no ${resource} yet. Add the first one with the form.`, 'empty');
      return;
    }
    setStatus('', '');
    list.replaceChildren(buildTable(result.data));
  }

  function buildTable(items) {
    const table = document.createElement('table');
    table.className = 'data-table';

    const headRow = document.createElement('tr');
    for (const column of [{ label: '#' }, ...columns, { label: 'Actions' }]) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = column.label;
      headRow.append(th);
    }
    const thead = document.createElement('thead');
    thead.append(headRow);

    const tbody = document.createElement('tbody');
    for (const item of items) {
      const row = document.createElement('tr');
      row.append(cell(item.id));
      for (const column of columns) {
        const value = item[column.field];
        // textContent, never innerHTML: data from the API is never read as HTML.
        row.append(cell(column.format ? column.format(value, item) : value));
      }
      row.append(actionsCell(item));
      tbody.append(row);
    }

    table.append(thead, tbody);
    return table;
  }

  function cell(text) {
    const td = document.createElement('td');
    td.textContent = text ?? '';
    return td;
  }

  function actionsCell(item) {
    const td = document.createElement('td');
    td.className = 'actions';

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'btn-small';
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => startEdit(item));

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn-small danger';
    remove.textContent = 'Delete';
    remove.addEventListener('click', () => deleteItem(item));

    td.append(edit, remove);
    return td;
  }

  function setStatus(text, kind) {
    status.textContent = text;
    status.className = kind ? `status ${kind}` : 'status';
    status.hidden = text === '';
  }

  // ---------- edit ----------
  function startEdit(item) {
    editingId = item.id;
    clearErrors(form);
    fillForm(form, item);
    formTitle.textContent = `Edit ${singular} #${item.id}`;
    submitButton.textContent = 'Save changes';
    cancelButton.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    form.querySelector('input, select, textarea')?.focus({ preventScroll: true });
  }

  function stopEdit() {
    editingId = null;
    form.reset();
    formTitle.textContent = createTitle;
    submitButton.textContent = createLabel;
    cancelButton.hidden = true;
  }

  cancelButton.addEventListener('click', () => {
    stopEdit();
    clearErrors(form);
  });

  // ---------- create / replace ----------
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const body = readForm(form);

    // Client-side check first; the server checks again anyway.
    const errors = [...checkForm(form), ...check(body)];
    if (errors.length > 0) {
      showErrors(form, errors);
      return;
    }

    clearErrors(form);
    submitButton.disabled = true;
    const result = editingId === null
      ? await apiRequest('POST', `/${resource}`, body)
      : await apiRequest('PUT', `/${resource}/${editingId}`, body);
    submitButton.disabled = false;

    if (!result.ok) {
      showErrors(form, result.errors);
      return;
    }

    const message = editingId === null
      ? `${capitalise(singular)} #${result.data.id} created.`
      : `${capitalise(singular)} #${result.data.id} saved.`;
    stopEdit();
    showMessage(form, message, 'ok');
    loadList();
  });

  // ---------- delete ----------
  async function deleteItem(item) {
    if (!window.confirm(`Delete ${singular} #${item.id}? This cannot be undone.`)) return;
    const result = await apiRequest('DELETE', `/${resource}/${item.id}`);
    if (!result.ok) {
      setStatus(`Could not delete ${singular} #${item.id}: ${result.errors.map(e => e.message).join(' ')}`, 'bad');
      return;
    }
    if (editingId === item.id) stopEdit();
    showMessage(form, `${capitalise(singular)} #${item.id} deleted.`, 'ok');
    loadList();
  }

  loadList();
}

const capitalise = text => text.charAt(0).toUpperCase() + text.slice(1);
