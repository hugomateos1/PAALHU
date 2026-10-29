# PAALHU

Website for PAALHU, an Indian restaurant in Madrid, with a customer booking chat.
Node.js 24 + Express 5.

## Install

```sh
npm install
```

## Configure

Create a `.env` file in the repo root (it is git-ignored):

```sh
PORT=3000
```

If there is no `.env`, the server uses port 3000.

## Run

```sh
npm start
```

Open http://localhost:3000. The site root redirects to `/pages/index.html`.

## Structure

```
src/
  server.js              starts the app (time zone, port, listen)
  app.js                 Express app: middleware, website files, routes
  routes/chat.js         chat URLs
  controllers/           read the request and answer
  middleware/            logger, error handler
  models/                data and business rules (coming next)
  validators.js          input checks; throw ValidationError
pages/ css/ js/ img/     the website (the only folders served)
```

## Endpoints

| Method | URL                | Answer |
|--------|--------------------|--------|
| GET    | `/api/chat/status` | `{ enabled }` |
| POST   | `/api/chat`        | body `{ session, message }` → `{ session, reply }`; 503 while the chat is off |

Errors are always `{ error, field? }`: 400 invalid data, 401 no login, 404 not found, 409 conflict, 500 server error.
