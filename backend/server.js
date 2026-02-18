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
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);

app.use(express.json({ limit: '25mb' }));

// ---------------------------------------------------------------------------
// System prompt — California DCC compliance auditor
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are an expert California cannabis packaging compliance auditor with deep knowledge of:
- California Code of Regulations Title 17 §§ 5303-5306 (DCC labeling requirements)
- Business & Professions Code § 26120 (cannabis labeling)
- Health & Safety Code cannabis packaging provisions
- DCC packaging and labeling requirements

Your job is to analyze cannabis product label/packaging artwork images and determine compliance with California regulations.

You must respond ONLY with a valid JSON object (no markdown, no extra text) in this exact structure:
{
  "verdict": "compliant" | "non-compliant" | "conditional",
  "score": <integer 0-100>,
  "summary": "<2-3 sentence executive summary of findings>",
  "checks": [
    {
      "id": "check_id",
      "name": "<requirement name>",
      "status": "pass" | "fail" | "warning" | "na",
      "detail": "<specific finding for this artwork>"
    }
  ],
  "recommendations": ["<specific actionable correction>", ...]
}

Evaluate ALL of these checks (use "na" if truly not determinable from image):
1. universal_symbol — CA universal cannabis symbol (exclamation in diamond) present
2. thc_content — THC content/percentage clearly displayed
3. cbd_content — CBD content shown (or "na" if non-CBD product)
4. net_weight — Net weight / net volume displayed
5. serving_size — Serving size and servings per package (for edibles/multi-serve)
6. health_warning — Required CA health and safety warning statement
7. pregnancy_warning — Pregnancy warning (KEEP OUT OF REACH OF CHILDREN / pregnancy symbol)
8. age_restriction — 21+ age restriction language or symbol
9. license_number — Retailer/distributor license number present
10. batch_lot — Batch or lot number present
11. manufacturer_info — Manufacturer/distributor name and city/state
12. no_health_claims — No prohibited health claims, medical claims, or disease treatment claims
13. no_minor_appeal — No cartoon characters, bright candy-like imagery, or elements appealing to minors
14. no_alcohol_refs — No alcohol or tobacco brand references
15. font_readability — Text is legible (min 6pt font for required disclosures)
16. child_resistant_note — Child-resistant packaging notation (if applicable)
17. correct_category — Product type/category correctly identified on label

Be specific and accurate. If you cannot see a required element, mark it as "fail" not "na". Only use "na" for checks that genuinely don't apply to this product type.`;

// ---------------------------------------------------------------------------
// POST /api/analyze
// Accepts: { imageBase64: string, mediaType: string }
// Returns: structured compliance JSON from Claude
// ---------------------------------------------------------------------------
app.post('/api/analyze', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set on the server.' });
  }

  const { imageBase64, mediaType } = req.body;
  if (!imageBase64 || !mediaType) {
    return res.status(400).json({ error: 'Missing imageBase64 or mediaType in request body.' });
  }

  try {
    const upstream = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: imageBase64 },
              },
              {
                type: 'text',
                text: 'Please analyze this cannabis product label/packaging artwork for California DCC compliance. Examine every visible element carefully and report your findings in the required JSON format.',
              },
            ],
          },
        ],
      }),
    });

    if (!upstream.ok) {
      const errData = await upstream.json().catch(() => ({}));
      return res.status(upstream.status).json({ error: errData.error?.message || 'Anthropic API error' });
    }

    const data = await upstream.json();
    const rawText = (data.content || []).map((b) => b.text || '').join('');

    // Strip optional markdown fences then extract the JSON object
    let jsonStr = rawText.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
    if (fenceMatch) jsonStr = fenceMatch[1];
    const objMatch = jsonStr.match(/\{[\s\S]+\}/);
    if (objMatch) jsonStr = objMatch[0];

    const result = JSON.parse(jsonStr);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Analysis error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Cannapliant backend listening on http://localhost:${PORT}`);
});
