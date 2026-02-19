// Cannapliant backend v1.1
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3001;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'https://cannapliant.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '25mb' }));

// ---------------------------------------------------------------------------
// POST /api/messages
// Generic proxy to Anthropic. The frontend sends: model, max_tokens,
// system, messages. This handler injects the auth headers and forwards.
// ---------------------------------------------------------------------------
app.post('/api/messages', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set on the server.' });
  }

  try {
    const upstream = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    res.status(upstream.status);
    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    // Stream response bytes straight through (works for both streaming and
    // non-streaming Anthropic responses).
    const reader = upstream.body.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) { res.end(); return; }
      res.write(value);
      return pump();
    };
    await pump();
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(502).json({ error: 'Failed to reach Anthropic API.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
