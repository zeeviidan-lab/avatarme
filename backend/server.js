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
  wolf:         { name: 'Arctic Wolf',  animal: 'arctic wolf',      base: 'thick white and grey fur, piercing blue eyes, powerful jaw, muscular build',           env: 'vast frozen tundra at twilight, aurora borealis rippling across a deep purple sky, snow-dusted pine forest stretching to the horizon, icy breath visible in the cold air' },
  snow_leopard: { name: 'Snow Leopard', animal: 'snow leopard',     base: 'rosette-spotted pale fur, sleek elegant build, pale green eyes, mountain predator',    env: 'dramatic Himalayan mountain cliff at golden hour, jagged snow-capped peaks behind, swirling mist below, warm orange light hitting the rock face' },
  monkey:       { name: 'Wise Monkey',  animal: 'monkey',           base: 'expressive face, rich golden-brown fur, intelligent deep eyes, nimble hands',          env: 'dense ancient jungle canopy, shafts of sunlight piercing through enormous tropical leaves, hanging vines, distant waterfall visible through the mist' },
  eagle:        { name: 'Golden Eagle', animal: 'golden eagle',     base: 'sharp curved talons, rich brown and gold feathers, fierce amber eyes, broad wingspan',  env: 'standing on a rocky mountain peak above the clouds, vast open sky, distant mountain range bathed in golden sunrise light, wind-swept environment' },
  fox:          { name: 'Red Fox',      animal: 'red fox',          base: 'vibrant fiery red and white fur, cunning amber eyes, sleek slender build, bushy tail',  env: 'misty autumn forest at dawn, golden and crimson fallen leaves on the ground, soft morning fog between ancient oak trees, dew on the grass' },
  bear:         { name: 'Grizzly Bear', animal: 'grizzly bear',     base: 'enormous powerful frame, thick dark-brown fur, commanding presence, small dark eyes',   env: 'rushing salmon river in the Pacific Northwest, dense green pine forest, dramatic overcast sky, water splashing around massive rocks' },
  tiger:        { name: 'White Tiger',  animal: 'white tiger',      base: 'pure white fur with charcoal black stripes, intense ice-blue eyes, raw muscular power',  env: 'ancient bamboo forest in morning fog, shafts of pale green light filtering through tall bamboo, scattered white flower petals on the ground' },
  owl:          { name: 'Great Owl',    animal: 'great horned owl', base: 'huge luminous amber eyes, mottled brown-grey feathers, broad silent wings, wise expression', env: 'old-growth forest at night, full moon visible through dark twisted branches, fireflies glowing in the darkness, thick ancient tree trunk' },
  yourself:   { name: 'Just Me',    animal: 'regular contemporary person',  base: 'natural realistic features, casual modern clothing, confident expression, authentic everyday look — no costume, no theme', env: 'natural urban setting at golden hour, soft cinematic background, modern city street or park bokeh, warm natural light' },
  animated:   { name: 'Animated Me', animal: 'Pixar style 3D animated person', base: 'stylized cartoon features, expressive big eyes, vibrant colors, Disney Pixar animation style, 3D CGI rendering, smooth shading', env: 'stylized cartoon world background, bright colorful environment, soft studio lighting, animated movie quality scene' },
  pirate:     { name: 'Pirate',     animal: 'pirate',               base: 'weathered sun-beaten face, eye patch, wild sea-tangled hair, worn leather coat, gold tooth', env: 'wooden ship deck during a tropical storm, crashing dark ocean waves, storm clouds lit by lightning, distant island silhouette on the horizon' },
  lawyer:     { name: 'Lawyer',     animal: 'sharp lawyer',         base: 'sharp intense gaze, tailored charcoal suit, confident jaw, power tie, cufflinks',          env: 'grand marble courthouse interior, tall stone columns, dramatic shafts of light through high windows, polished floor reflecting the ceiling' },
  president:  { name: 'President',  animal: 'powerful president',   base: 'commanding distinguished presence, strong jaw, formal dark suit, American flag pin',        env: 'White House South Lawn at sunset, American flags flanking the entrance, manicured grounds, warm golden light on the columned facade' },
  inmate:     { name: 'Inmate',     animal: 'prison inmate',        base: 'hardened scarred face, close-shaved head, orange prison uniform, raw intense expression',   env: 'concrete prison yard under harsh midday sun, high razor-wire fences, stark grey walls casting hard shadows, single patch of blue sky above' },
  doctor:     { name: 'Doctor',     animal: 'surgeon doctor',       base: 'sharp focused eyes above a surgical mask, blue surgical scrubs, stethoscope, steady hands', env: 'modern hospital operating room, gleaming stainless steel surgical lights overhead, sterile white and blue environment, heart monitor in background' },
  detective:  { name: 'Detective',  animal: 'noir detective',       base: 'sharp observant eyes, wool trench coat, fedora hat, cigarette, stubbled jaw',               env: 'rain-soaked 1940s city street at night, neon signs reflecting in puddles, misty streetlights, dark alley entrance, wet cobblestone pavement' },
  boxer:      { name: 'Boxer',      animal: 'champion boxer',       base: 'bruised jaw, gloves raised in guard stance, sweat-glistening skin, athletic muscular frame',  env: 'professional boxing ring under blinding arena lights, roaring crowd blurred in background, corner of the ring, canvas floor, ropes visible' },
  rockstar:   { name: 'Rock Star',  animal: 'rock star musician',   base: 'wild electric hair, dark stage makeup, leather jacket, guitar strap, intense performance face', env: 'massive stadium concert stage, blinding spotlights and laser beams cutting through smoke, thousands of fans visible below, giant speaker stacks' },
  soldier:    { name: 'Soldier',    animal: 'elite soldier',        base: 'battle-worn face, full tactical gear and camouflage, intense determined eyes, dog tags',       env: 'urban war zone at dusk, bombed-out city street, dust particles in golden-red light, collapsed buildings in background, smoke rising' },
  wizard:     { name: 'Wizard',     animal: 'ancient wizard',       base: 'long silver beard, glowing ancient eyes, ornate mystical robes, carved wooden staff',         env: 'ancient stone tower library at night, floor-to-ceiling bookshelves, floating magical orbs of light, swirling arcane energy, moonlit window' },
};

async function analyzeAndBuildPrompt(imageBase64, imageMime, gameAnswers, rankOrder, avatarKey) {
  const av = AVATARS[avatarKey];
  const userContext = `Avatar chosen: ${av.animal}
Reaction game answers: ${gameAnswers}
Trait ranking (most to least important): ${rankOrder}
${imageBase64 ? 'Face photo: provided (analyze expression, energy, features)' : 'No face photo provided'}`;

  const systemPrompt = `You are AvatarMe's AI engine. Analyze user personality data and generate:
1. A deeply personal description of why this avatar matches them
2. A highly detailed FLUX image prompt for a unique full body photorealistic ${av.animal} character

Image prompt rules:
- Full body portrait of a ${av.animal} (${av.base}), head to toe, standing in a powerful confident pose
- Background environment: ${av.env} — describe it in rich detail, it must look like a real photograph or film still
- Encode personality into visual details: eye intensity, expression, posture, lighting direction, color palette
- ${ ['wolf','snow_leopard','monkey','eagle','fox','bear','tiger','owl'].includes(avatarKey) ? 'IMPORTANT: This is a REAL ANIMAL — absolutely no clothing, no outfit, no accessories, no armor — pure natural animal body only' : 'HUMAN CHARACTER: include the full iconic costume and outfit for this character type' }
- Style: ${ avatarKey === 'animated' ? 'Pixar / Disney 3D animated movie style, stylized cartoon rendering, vibrant saturated colors, expressive oversized eyes, smooth CGI shading, animated film quality' : 'photorealistic, shot on RED cinema camera, National Geographic meets Hollywood cinematography, physically accurate lighting, real-world textures, no cartoon or CGI look' }
- 2-3 sentences, highly descriptive
- End with: "${ avatarKey === 'animated' ? 'full body, 3D animated, Pixar style, Disney animation, vibrant, high detail, stylized CGI' : 'full body, photorealistic, 8K resolution, cinematic photography, real environment, physically accurate lighting, sharp detail' }"

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

const HUMAN_AVATARS = new Set(['yourself','animated','pirate','lawyer','president','inmate','detective','boxer','rockstar','soldier','doctor','wizard']);

// InstantID — generates image WITH the user's face identity preserved
async function generateWithFace(prompt, faceBase64, faceMime) {
  const faceDataUrl = `data:${faceMime};base64,${faceBase64}`;
  const INSTANT_ID_VERSION = '2e4785a4d80dadf580077b2244c8d7c05d8e3faac04a04c02d8e099dd2876789';
  const startRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: INSTANT_ID_VERSION, input: {
      image: faceDataUrl,
      prompt,
      negative_prompt: 'low quality, blurry, deformed, ugly, bad anatomy, multiple faces, extra limbs',
      num_inference_steps: 30,
      guidance_scale: 5,
      ip_adapter_scale: 0.8,
      controlnet_conditioning_scale: 0.8,
      output_format: 'jpg',
      output_quality: 95,
    } })
  });
  const prediction = await startRes.json();
  if (!prediction.id) { console.error('InstantID start error:', JSON.stringify(prediction)); return null; }
  console.log('InstantID started:', prediction.id);

  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}` }
    });
    const result = await pollRes.json();
    if (result.status === 'succeeded') {
      console.log('InstantID succeeded');
      return Array.isArray(result.output) ? result.output[0] : result.output;
    }
    if (result.status === 'failed') { console.error('InstantID failed:', result.error); return null; }
  }
  console.error('InstantID timed out');
  return null;
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

    let imageUrl = null;

    // If face uploaded AND human avatar → use InstantID for true identity preservation
    if (imageBase64 && HUMAN_AVATARS.has(avatarKey)) {
      imageUrl = await generateWithFace(claudeResult.flux_prompt, imageBase64, imageMime);
    }

    // Fallback (or animal/no-face) → regular FLUX
    if (!imageUrl) {
      imageUrl = await generateImage(claudeResult.flux_prompt);
    }

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
