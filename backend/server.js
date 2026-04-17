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

// In-memory job store
const jobs = {};

// Avatar definitions
const AVATARS = {
  wolf:         { name: 'Arctic Wolf',  animal: 'arctic wolf',      base: 'thick white and grey fur, piercing eyes, powerful jaw' },
  snow_leopard: { name: 'Snow Leopard', animal: 'snow leopard',     base: 'spotted fur, elegant build, mountain predator' },
  monkey:       { name: 'Wise Monkey',  animal: 'monkey',           base: 'expressive face, golden brown fur, intelligent eyes' },
  eagle:        { name: 'Golden Eagle', animal: 'golden eagle',     base: 'sharp talons, brown and gold feathers, fierce beak' },
  fox:          { name: 'Red Fox',      animal: 'red fox',          base: 'fiery red fur, cunning eyes, sleek build' },
  bear:         { name: 'Grizzly Bear', animal: 'grizzly bear',     base: 'massive frame, thick dark fur, commanding presence' },
  tiger:        { name: 'White Tiger',  animal: 'white tiger',      base: 'white fur with black stripes, intense gaze, raw power' },
  owl:          { name: 'Great Owl',    animal: 'great horned owl', base: 'huge amber eyes, mottled feathers, ancient wisdom' },
  pirate:     { name: 'Pirate',     animal: 'pirate',               base: 'weathered face, eye patch or scar, wild hair, sea-worn skin' },
  lawyer:     { name: 'Lawyer',     animal: 'sharp lawyer',         base: 'intense gaze, sharp suit, confident jaw, courthouse background' },
  president:  { name: 'President',  animal: 'powerful president',   base: 'commanding presence, distinguished features, formal attire, flag background' },
  inmate:     { name: 'Inmate',     animal: 'prison inmate',        base: 'hardened face, shaved head or rough hair, prison uniform, raw expression' },
  doctor:     { name: 'Doctor',     animal: 'surgeon doctor',       base: 'focused eyes, surgical mask pulled down, scrubs, OR background' },
  detective:  { name: 'Detective',  animal: 'noir detective',       base: 'sharp eyes, trench coat, rain-soaked city background, cigarette smoke' },
  boxer:      { name: 'Boxer',      animal: 'champion boxer',       base: 'bruised face, gloves up, sweat glistening, arena lights background' },
  rockstar:   { name: 'Rock Star',  animal: 'rock star musician',   base: 'wild hair, stage makeup, guitar strap, concert light background' },
  soldier:    { name: 'Soldier',    animal: 'elite soldier',        base: 'battle gear, intense eyes, camouflage, war zone background' },
  wizard:     { name: 'Wizard',     animal: 'ancient wizard',       base: 'long beard, glowing eyes, mystical robes, magical aura background' },
};

async function analyzeAndBuildPrompt(imageBase64, imageMime, gameAnswers, rankOrder, avatarKey) {
  const av = AVATARS[avatarKey];
  const userContext = `Avatar chosen: ${av.animal}
Reaction game answers: ${gameAnswers}
Trait ranking (most to least important): ${rankOrder}
${imageBase64 ? 'Face photo: provided (analyze expression, energy, features)' : 'No face photo provided'}`;

  const systemPrompt = `You are AvatarMe's AI engine. Analyze user personality data and generate:
1. A deeply personal description of why this avatar matches them
2. A highly detailed FLUX image prompt for a unique full body 3D ${av.animal} character

Image prompt rules:
- Full body 3D render of a ${av.animal} (${av.base}), head to toe, standing in a powerful pose
- Encode personality into visual details: eye intensity, fur/skin texture, expression, posture, outfit/armor, surrounding environment, lighting, color palette
- Style: hyper-realistic 3D CGI, Unreal Engine 5 quality, cinematic game character art
- 2-3 sentences, highly descriptive
- End with: "full body, ultra detailed, 8K, Unreal Engine 5, cinematic lighting, dramatic environment background"

Respond in JSON only:
{"description":"2-3 sentence personal description","flux_prompt":"detailed image prompt","traits":{"Composure":80,"Strategy":75,"Instinct":85,"Adaptability":70},"dominant_trait":"one word"}`;

  const messages = imageBase64 ? [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: imageMime, data: imageBase64 } },
      { type: 'text', text: `${systemPrompt}\n\nUser data:\n${userContext}` }
    ]
  }] : [{ role: 'user', content: `${systemPrompt}\n\nUser data:\n${userContext}` }];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 800, messages })
  });

  const data = await response.json();
  if (!data.content || !data.content[0]) throw new Error('Claude error: ' + JSON.stringify(data));
  const raw = data.content[0].text.replace(/```json|```/g, '').trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in Claude response');
  return JSON.parse(match[0]);
}

async function generateImage(fluxPrompt) {
  const startRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { prompt: fluxPrompt, aspect_ratio: '2:3', output_format: 'jpg', output_quality: 95 } })
  });

  const prediction = await startRes.json();
  if (!prediction.id) throw new Error('Replicate error: ' + JSON.stringify(prediction));

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}` }
    });
    const result = await pollRes.json();
    if (result.status === 'succeeded') return result.output[0];
    if (result.status === 'failed') throw new Error('Image generation failed: ' + result.error);
  }
  throw new Error('Timed out');
}

// Run the full pipeline in background
async function runJob(jobId, imageBase64, imageMime, gameAnswers, rankOrder, avatarKey) {
  try {
    jobs[jobId].status = 'analyzing';
    const claudeResult = await analyzeAndBuildPrompt(imageBase64, imageMime, gameAnswers, rankOrder, avatarKey);

    jobs[jobId].status = 'generating';
    jobs[jobId].description = claudeResult.description;
    jobs[jobId].traits = claudeResult.traits;
    jobs[jobId].dominant_trait = claudeResult.dominant_trait;

    const imageUrl = await generateImage(claudeResult.flux_prompt);

    jobs[jobId].status = 'done';
    jobs[jobId].image_url = imageUrl;
    jobs[jobId].avatar_name = AVATARS[avatarKey].name;
  } catch (err) {
    jobs[jobId].status = 'error';
    jobs[jobId].error = err.message;
    console.error('Job error:', err);
  }
}

// POST /start — kick off job, return immediately
app.post('/start', upload.single('face'), (req, res) => {
  const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2);
  const avatarKey = req.body.avatar || 'wolf';
  const gameAnswers = req.body.q1 || '';
  const rankOrder = req.body.q2 || '';

  let imageBase64 = null, imageMime = null;
  if (req.file) {
    imageBase64 = fs.readFileSync(req.file.path).toString('base64');
    imageMime = req.file.mimetype;
    fs.unlinkSync(req.file.path);
  }

  jobs[jobId] = { status: 'starting' };
  runJob(jobId, imageBase64, imageMime, gameAnswers, rankOrder, avatarKey);

  res.json({ jobId });
});

// GET /status/:id — poll for result
app.get('/status/:id', (req, res) => {
  const job = jobs[req.params.id];
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = 3001;
app.listen(PORT, () => console.log(`✅ AvatarMe running on http://localhost:${PORT}`));
