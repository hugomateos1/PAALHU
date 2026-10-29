// The only place where errors become HTTP answers. Always { error, field? }.
//   ValidationError -> 400 · no login -> 401 · not found -> 404 · no room / status not allowed -> 409 · anything else -> 500
// Validators throw ValidationError; models (step 3) and auth (step 4) throw errors that carry their own `status`.
import { ValidationError } from '../validators.js';

const KNOWN = new Set([400, 401, 404, 409]);

export default function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err instanceof ValidationError) return res.status(400).json({ error: err.message, ...(err.field && { field: err.field }) });
  // express.json(): malformed JSON or a body over the limit.
  if (err.type?.startsWith('entity.') || err.type === 'charset.unsupported') return res.status(400).json({ error: 'Invalid request.' });
  if (KNOWN.has(err.status)) return res.status(err.status).json({ error: err.message, ...(err.field && { field: err.field }) });
  // Internal details (stack, file paths) stay in the server log.
  console.error(err);
  res.status(500).json({ error: 'Server error.' });
}
