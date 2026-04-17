require('dotenv').config({ path: require('path').join(__dirname, '../.env'), override: true });
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// Avatar bank
const AVATAR_BANK = {
  wolf:         { emoji: '🐺', name: 'Arctic Wolf',    url: 'https://replicate.delivery/xezq/qxPrP7eOk31TZaGJvluj0xO0xt11BgXJQDW5JfBF2pv4CBcWA/out-0.jpg', traits: ['Loyal', 'Fierce', 'Tactical'] },
  snow_leopard: { emoji: '🐆', name: 'Snow Leopard',   url: 'https://replicate.delivery/xezq/U8OezzvNfLlWDEZnGqSgxvC6IOG1FyEWRY3wUJQjGt8FDBcWA/out-0.jpg', traits: ['Composed', 'Precise', 'Rare'] },
  monkey:       { emoji: '🐒', name: 'Wise Monkey',    url: 'https://replicate.delivery/xezq/FzDFebpA7CUKXKmFaMWf20WDgfmyDZHA1as9b2JyuDFkGC4sA/out-0.jpg', traits: ['Curious', 'Playful', 'Clever'] },
  eagle:        { emoji: '🦅', name: 'Golden Eagle',   url: 'https://replicate.delivery/xezq/QMHVobFHUcrjMZ2l0aYBwycDAlZfQsbk8LO1kDHVVv3vhAOLA/out-0.jpg', traits: ['Visionary', 'Bold', 'Free'] },
  fox:          { emoji: '🦊', name: 'Void Fox',       url: 'https://replicate.delivery/xezq/uZqiy5Qhd962GduHVbtmWFwPIf1C4WAhUWTNucekD9TrDBcWA/out-0.jpg', traits: ['Cunning', 'Adaptable', 'Sharp'] },
};

// Analyze face + quiz with Claude
async function analyzeWithClaude(imageBase64, imageMime, quizAnswers) {
  const prompt = `You are AvatarMe's personality engine. Analyze this face photo and the quiz answers below.

Quiz answers:
- Challenge response: ${quizAnswers.q1 || 'not answered'}
- Group energy: ${quizAnswers.q2 || 'not answered'}

Available avatars: wolf, snow_leopard, monkey, eagle, fox

Respond in JSON only, no markdown:
{
  "avatar_match": "wolf/snow_leopard/monkey/eagle/fox",
  "description": "2-3 sentence personalized description of why this avatar matches them — make it feel deeply personal",
  "traits": {
    "Composure": 85,
    "Strategy": 80,
    "Instinct": 75,
    "Adaptability": 70
  },
  "dominant_trait": "one word"
}
Trait scores must be integers between 40-98. Make it unique to their answers.`;

  const body = JSON.stringify({
    model: 'claude-opus-4-5',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: imageMime, data: imageBase64 }
        },
        { type: 'text', text: prompt }
      ]
    }]
  });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body
  });

  const data = await response.json();
  if (!data.content || !data.content[0]) throw new Error('Claude error: ' + JSON.stringify(data));
  const raw = data.content[0].text.replace(/```json|```/g, '').trim();
  // extract JSON object from response
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in Claude response: ' + raw);
  return JSON.parse(match[0]);
}

// Main endpoint
app.post('/analyze', upload.single('face'), async (req, res) => {
  try {
    const quizAnswers = {
      q1: req.body.q1 || '',
      q2: req.body.q2 || ''
    };

    let claudeResult;

    if (req.file) {
      // With face photo
      const imageBuffer = fs.readFileSync(req.file.path);
      const imageBase64 = imageBuffer.toString('base64');
      const imageMime = req.file.mimetype;
      claudeResult = await analyzeWithClaude(imageBase64, imageMime, quizAnswers);
      fs.unlinkSync(req.file.path); // cleanup
    } else {
      // Quiz only fallback
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 600,
          messages: [{
            role: 'user',
            content: `You are AvatarMe's personality engine. Based on these quiz answers, match the user to an avatar.

Quiz answers:
- Challenge response: ${quizAnswers.q1 || 'not answered'}
- Group energy: ${quizAnswers.q2 || 'not answered'}

Available avatars: wolf, snow_leopard, monkey, eagle, fox

Respond in JSON only, no markdown:
{"avatar_match":"wolf/snow_leopard/monkey/eagle/fox","description":"2-3 sentence personalized description","traits":{"Composure":85,"Strategy":80,"Instinct":75,"Adaptability":70},"dominant_trait":"one word"}`
          }]
        })
      });
      const data = await response.json();
      if (!data.content || !data.content[0]) throw new Error('Claude error: ' + JSON.stringify(data));
      const raw = data.content[0].text.replace(/```json|```/g, '').trim();
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON in Claude response: ' + raw);
      claudeResult = JSON.parse(match[0]);
    }

    const avatar = AVATAR_BANK[claudeResult.avatar_match] || AVATAR_BANK.fox;

    res.json({
      success: true,
      avatar: {
        key: claudeResult.avatar_match,
        name: avatar.name,
        emoji: avatar.emoji,
        image_url: avatar.url,
        traits: avatar.traits
      },
      description: claudeResult.description,
      trait_scores: claudeResult.traits,
      dominant_trait: claudeResult.dominant_trait
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Serve frontend
app.use(express.static(require('path').join(__dirname, '../frontend')));

const PORT = 3001;
app.listen(PORT, () => console.log(`✅ AvatarMe backend running on http://localhost:${PORT}`));
