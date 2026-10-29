process.env.TZ = 'Europe/Madrid'; // shifts and "tonight" are Madrid time
// PAALHU website server.
//   npm start        ->  http://localhost:3000
// The app itself (middleware, routes) is in app.js; this file only starts it.

import app from './app.js';
import { CHAT_ENABLED } from './controllers/chatController.js';

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  console.log(`PAALHU at http://localhost:${PORT}  ·  chat ${CHAT_ENABLED ? 'enabled' : 'disabled (pilot: no model connected)'}`);
});
