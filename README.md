# Cannapliant

Cannabis compliance checker powered by Claude (Anthropic).

## Structure

```
cannapliant/
  frontend/   Vite + React app
  backend/    Express proxy server (keeps the API key server-side)
```

## Local development

### 1. Backend

```bash
cd backend
npm install
# Create a .env file with your key:
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
npm run dev          # starts on http://localhost:3001
```

> The backend reads `ANTHROPIC_API_KEY` from the environment. Never commit `.env`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev          # starts on http://localhost:5173
```

Vite proxies every `/api/*` request to `http://localhost:3001` during development,
so the frontend never speaks directly to Anthropic.

## Production deployment (Vercel)

### Backend (Vercel Serverless / any Node host)

Set the following environment variables in your hosting dashboard:

| Variable           | Value                                      |
|--------------------|--------------------------------------------|
| `ANTHROPIC_API_KEY`| Your Anthropic secret key                  |
| `FRONTEND_ORIGIN`  | e.g. `https://cannapliant.vercel.app`      |

### Frontend

Set the build command to `npm run build` and the output directory to `dist`.
No environment variables are needed – API calls go through `/api/messages`
which Vercel rewrites to the backend service.

## Adding the compliance-checker component

Paste your `compliance-checker.jsx` content into `frontend/src/App.jsx` and
update every fetch call:

```js
// Before
fetch('https://api.anthropic.com/v1/messages', {
  headers: { 'x-api-key': 'sk-ant-...' },
  ...
})

// After
fetch('/api/messages', {
  // no API key header – the backend adds it
  ...
})
```
