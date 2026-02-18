// ---------------------------------------------------------------------------
// API endpoint
//
// In production (Vercel), VITE_API_URL is set to your Railway backend URL,
// e.g. https://cannapliant-backend.up.railway.app
// The full path becomes: https://cannapliant-backend.up.railway.app/api/messages
//
// In local dev (no VITE_API_URL set), the call goes to /api/messages which
// Vite's proxy forwards to http://localhost:3001/api/messages.
// ---------------------------------------------------------------------------
const API_MESSAGES_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/messages`
  : '/api/messages';

// ---------------------------------------------------------------------------
// TODO: Paste the contents of compliance-checker.jsx below.
//
// Replace every fetch call like this:
//
//   BEFORE:
//   fetch('https://api.anthropic.com/v1/messages', {
//     headers: { 'x-api-key': 'sk-ant-...', ... },
//     ...
//   })
//
//   AFTER:
//   fetch(API_MESSAGES_URL, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(payload),
//   })
//
// The backend adds the Authorization and x-api-key headers automatically.
// ---------------------------------------------------------------------------

export default function App() {
  return <div>Paste compliance-checker.jsx content here.</div>;
}
