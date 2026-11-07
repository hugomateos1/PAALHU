// The ONE place in the front end that calls fetch(). Every page script imports apiRequest from here.
//
//   const result = await apiRequest('GET', '/reservations');
//   result.ok      -> true for 2xx, false otherwise
//   result.status  -> the HTTP status (0 if the server could not be reached)
//   result.data    -> the parsed JSON body on success (null for 204 No Content)
//   result.errors  -> on failure, always a list of { field, message }, so pages show every error the same way
//
// fetch() only fails when there is no network: a 400, 404 or 500 still "succeeds",
// so response.ok has to be checked here.

const API_BASE = '/api';

export async function apiRequest(method, path, body) {
  const options = { method, headers: {} };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(API_BASE + path, options);
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      errors: [{ field: null, message: 'Cannot reach the server. Open the site at http://localhost:3000 after npm start.' }],
    };
  }

  // 204 has no body; any other answer from our API is JSON (errors too).
  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (response.ok) {
    return { ok: true, status: response.status, data, errors: [] };
  }

  // A 400 from a validator brings { errors: [...] }; a 404 or 500 brings { error: '...' }.
  const errors = Array.isArray(data?.errors)
    ? data.errors
    : [{ field: null, message: data?.error ?? `Request failed (${response.status}).` }];
  return { ok: false, status: response.status, data: null, errors };
}
