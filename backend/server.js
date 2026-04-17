require('dotenv').config({ path: require('path').join(__dirname, '../.env'), override: true });
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// Avatar definitions — name + base style guide for FLUX
const AVATARS = {
  wolf:         { name: 'Arctic Wolf',  animal: 'arctic wolf',    base: 'thick white and grey fur, piercing eyes, powerful jaw' },
  snow_leopard: { name: 'Snow Leopard', animal: 'snow leopard',   base: 'spotted fur, elegant build, mountain predator' },
  monkey:       { name: 'Wise Monkey',  animal: 'monkey',         base: 'expressive face, golden brown fur, intelligent eyes' },
  eagle:        { name: 'Golden Eagle', animal: 'golden eagle',   base: 'sharp talons, brown and gold feathers, fierce beak' },
  fox:          { name: 'Red Fox',      animal: 'red fox',        base: 'fiery red fur, cunning eyes, sleek build' },
  bear:         { name: 'Grizzly Bear', animal: 'grizzly bear',   base: 'massive frame, thick dark fur, commanding presence' },
  tiger:        { name: 'White Tiger',  animal: 'white tiger',    base: 'white fur with black stripes, intense gaze, raw power' },
  owl:          { name: 'Great Owl',    animal: 'great horned owl', base: 'huge amber eyes, mottled feathers, ancient wisdom' },
};

// Step 1: Ask Claude to analyze user + build a FLUX prompt
async function analyzeAndBuildPrompt(imageBase64, imageMime, gameAnswers, rankOrder, avatarKey) {
  const av = AVATARS[avatarKey];

  const userContext = `
Avatar chosen: ${av.animal}
Reaction game answers: ${gameAnswers}
Trait ranking (most to least important): ${rankOrder}
${imageBase64 ? 'Face photo: provided (analyze expression, energy, features)' : 'No face photo provided'}
  `.trim();

  const systemPrompt = `You are AvatarMe's AI engine. You analyze a user's personality data and generate two things:
1. A deeply personal description of why this animal matches them
2. A highly detailed, cinematic image generation prompt for FLUX that creates a unique ${av.animal} portrait shaped by their specific personality

The image prompt must:
- Be a close-up portrait of a ${av.animal} (${av.base})
- Encode the user's personality into visual details: eye intensity, fur/feather texture, expression, posture, environment, lighting, color palette
- Feel like a National Geographic editorial portrait — photorealistic, dramatic, ultra detailed
- Be 2-3 sentences long, highly descriptive
- End with: "ultra detailed, 8K, cinematic lighting, shallow depth of field, dark dramatic background"

Respond in JSON only, no markdown:
{
  "description": "2-3 sentence personal description of why this avatar matches the user, deeply specific to their answers",
  "flux_prompt": "your detailed image generation prompt here",
  "traits": {"Composure": 80, "Strategy": 75, "Instinct": 85, "Adaptability": 70},
  "dominant_trait": "one word"
}
Trait scores: integers 40-98, varied, reflecting their personality.`;

  const messages = imageBase64 ? [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: imageMime, data: imageBase64 } },
      { type: 'text', text: `${systemPrompt}\n\nUser data:\n${userContext}` }
    ]
  }] : [{
    role: 'user',
    content: `${systemPrompt}\n\nUser data:\n${userContext}`
  }];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 800, messages })
  });

  const data = await response.json();
  if (!data.content || !data.content[0]) throw new Error('Claude error: ' + JSON.stringify(data));
  const raw = data.content[0].text.replace(/```json|```/g, '').trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in Claude response: ' + raw);
  return JSON.parse(match[0]);
}

// Step 2: Generate unique avatar image with FLUX
async function generateImage(fluxPrompt) {
  const payload = JSON.stringify({
    input: {
      prompt: fluxPrompt,
      aspect_ratio: '1:1',
      output_format: 'jpg',
      output_quality: 95,
      num_inference_steps: 4
    }
  });

  const startRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: payload
  });

  const prediction = await startRes.json();
  const predId = prediction.id;
  if (!predId) throw new Error('Replicate error: ' + JSON.stringify(prediction));

  // Poll until done
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
      headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}` }
    });
    const result = await pollRes.json();
    if (result.status === 'succeeded') return result.output[0];
    if (result.status === 'failed') throw new Error('Image generation failed: ' + result.error);
  }
  throw new Error('Image generation timed out');
}

// Main endpoint
app.post('/analyze', upload.single('face'), async (req, res) => {
  try {
    const avatarKey = req.body.avatar || 'wolf';
    const gameAnswers = req.body.q1 || '';
    const rankOrder = req.body.q2 || '';

    let imageBase64 = null, imageMime = null;
    if (req.file) {
      imageBase64 = fs.readFileSync(req.file.path).toString('base64');
      imageMime = req.file.mimetype;
      fs.unlinkSync(req.file.path);
    }

    // Step 1: Claude analyzes + builds prompt
    const claudeResult = await analyzeAndBuildPrompt(imageBase64, imageMime, gameAnswers, rankOrder, avatarKey);

    // Step 2: FLUX generates unique image
    const imageUrl = await generateImage(claudeResult.flux_prompt);

    const av = AVATARS[avatarKey];
    res.json({
      success: true,
      avatar: { key: avatarKey, name: av.name },
      image_url: imageUrl,
      flux_prompt: claudeResult.flux_prompt,
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
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = 3001;
app.listen(PORT, () => console.log(`✅ AvatarMe running on http://localhost:${PORT}`));
