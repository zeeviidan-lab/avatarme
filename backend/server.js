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
  yourself:   { name: 'Just Me',    animal: 'regular contemporary person',  base: 'natural realistic features, smooth flattering skin, casual modern clothing, relaxed confident expression, authentic everyday look — no costume, no theme', env: 'bright overcast outdoor setting or open shade on a quiet city street, soft diffused daylight, gentle out-of-focus background, clean soft portrait lighting — no direct sun, no harsh shadows' },
  animated:   { name: 'Animated Me', animal: 'stylized 3D game-figure of a person (Pixar / Fortnite / Overwatch style)', base: 'simplified cartoon-proportioned features, bold clean shapes, smooth shaded skin, large expressive eyes, simple readable outfit fitting their personality — low-detail stylized toy-figure look, NOT photoreal', env: 'clean game-render backdrop matching their personality (soft gradient, simple stylized scene), bright even lighting, subtle rim light, shallow depth of field' },
  link:        { name: 'Link',          animal: 'Link from The Legend of Zelda', base: 'green tunic, pointed elf ears, blonde hair, blue determined eyes, master sword on back', env: 'lush Hyrule field at golden hour, distant mountains, swaying grass, soft volumetric god rays' },
  kratos:      { name: 'Kratos',        animal: 'Kratos from God of War',        base: 'pale skin with red tattoo, beard, intense angry eyes, leviathan axe, leather armor', env: 'ash-grey Norse battlefield, broken stone runes, swirling smoke, dim cold backlight' },
  mario:       { name: 'Mario',         animal: 'Super Mario',                   base: 'red cap with M, blue overalls, thick black mustache, cheerful smile, white gloves', env: 'Mushroom Kingdom green field, fluffy clouds, floating coins, bright cheerful lighting' },
  master_chief:{ name: 'Master Chief',  animal: 'Master Chief from Halo',        base: 'green spartan armor, gold reflective visor helmet, MA5 rifle, heavy boots', env: 'alien battlefield at twilight, glassed earth, distant covenant ships, glowing plasma, volumetric haze' },
  geralt:      { name: 'Geralt',        animal: 'Geralt of Rivia from The Witcher', base: 'long white hair, yellow cat eyes, scarred face, two swords on back, dark leather armor', env: 'dark misty swamp at dusk, gnarled trees, glowing eyes in shadows, cool blue moonlight' },
  aragorn:     { name: 'Aragorn',       animal: 'Aragorn from Lord of the Rings', base: 'long dark hair, weathered noble face, ranger cloak, sword Andúril, elven brooch', env: 'Middle-earth mountain pass at dawn, distant peaks, banners of Gondor in the wind, soft golden mist' },
  joker:       { name: 'Joker',         animal: 'The Joker',                     base: 'white face paint, green messy hair, red painted smile, purple suit, manic eyes', env: 'gritty Gotham alley at night, neon signs flickering, smoke, dramatic underlight' },
  neo:         { name: 'Neo',           animal: 'Neo from The Matrix',           base: 'long black trench coat, sleek black sunglasses, short dark hair, stoic expression', env: 'green digital rain corridor, mirrored floors, infinite hallway, dramatic side lighting' },
  mickey:      { name: 'Mickey',        animal: 'Mickey Mouse',                  base: 'black round ears, big round eyes, red shorts with two yellow buttons, white gloves, yellow shoes, cheerful grin', env: 'classic Disney castle at sunrise, fireworks, fluffy clouds, bright pastel colors, magical sparkles' },
  arthas:      { name: 'Lich King',     animal: 'Arthas the Lich King from World of Warcraft', base: 'spiked ice crown helmet, glowing icy blue eyes, pale undead face, Frostmourne sword, dark armor', env: 'frozen throne in Icecrown Citadel, swirling snow, jagged ice spires, cold blue light' },
  illidan:     { name: 'Illidan',       animal: 'Illidan Stormrage from World of Warcraft', base: 'horned demon hunter, long green-black hair, glowing green eyes behind blindfold, purple skin, twin warglaives', env: 'fel-green burning Outland landscape, floating rocks, demonic ruins, swirling green energy' },
  sylvanas:    { name: 'Sylvanas',      animal: 'Sylvanas Windrunner banshee queen from World of Warcraft', base: 'long white hair, glowing red eyes, pale elf features, pointed ears, dark ranger armor, black bow', env: 'Undercity ruins under a blood-red sky, dark gothic architecture, swirling shadow magic, eerie atmosphere' },
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
- Candid full body portrait of a ${av.animal} (${av.base}), captured in a natural unposed moment — not a hero pose, not posed for the camera
- Setting: ${av.env} — described in plain natural language, like a real place that exists
- Subtle personality cues only: gaze, posture, micro-expression, the way light falls. Avoid theatrical drama.
- Composition: off-center framing, natural camera angle at eye level or slightly ABOVE (never from below — low angles distort faces unflatteringly), shallow depth of field, environment visible but not overwhelming
- ${ ['wolf','snow_leopard','monkey','eagle','fox','bear','tiger','owl'].includes(avatarKey) ? `REAL ANIMAL — absolutely no clothing, no outfit, no accessories — natural animal body only, like a wildlife documentary still.${imageBase64 ? avatarKey === 'monkey' ? ` SPIRIT-ANIMAL ECHO (MANDATORY — must appear explicitly in the flux_prompt): the japanese macaque has a bare flesh-pink face surrounded by a fur ruff — this is the most human-readable animal in the bank, so the resemblance must be obvious. Study the user's photo and write into the flux_prompt: (a) the macaque's facial skin tone matches the user's actual skin tone (name it: "warm olive", "fair pink", "deep brown"), (b) the surrounding fur ruff/cheek tufts/crown match the user's hair and beard — color, density and pattern (e.g. "thick salt-and-pepper fur ruff framing the face like a full beard", "short reddish-brown crown matching cropped auburn hair", "bald pink crown with grey side tufts"), (c) eye color named explicitly (warm brown, amber, hazel), (d) the same brow shape and expression (heavy thoughtful brow, gentle calm gaze, sharp alert focus). The result must read as a real macaque that anyone seeing the user's photo would instantly recognise.` : ` SPIRIT-ANIMAL ECHO (MANDATORY — must appear explicitly in the flux_prompt): study the user's face photo and pick specific, visible features — their actual eye color (name it: "amber", "warm brown", "green-grey"), their hair/beard color and pattern (name it: "salt-and-pepper grey muzzle and chest", "sandy-brown coat with grey around the eyes"), their expression (calm, intense, gentle). The animal's fur/feather coloring and facial markings MUST directly reflect these — e.g. a wolf with the user's salt-and-pepper grey around its muzzle and warm brown eyes. These must be written into the flux_prompt as concrete visual details, not as subtext. The animal still reads as a real animal — but one that visibly resembles the person.` : ''}` : 'ICONIC CHARACTER — the character look (costume, signature features, iconic hair/helmet/color scheme) MUST be fully rendered. The user\'s face should carry recognizable identity (bone structure, beard/hair, expression) but wearing the complete iconic outfit of this character — never their regular clothes with just an accessory.' }
- Style: ${ ['wolf','snow_leopard','monkey','eagle','fox','bear','tiger','owl','yourself'].includes(avatarKey) ? 'documentary photography, soft diffused light (overcast sky, open shade, or soft window light — NEVER direct harsh sun), gentle flattering shadows, fine film grain, looks like it was actually photographed' : avatarKey === 'animated' ? 'clean stylized 3D render, Pixar / Fortnite / Overwatch style — smooth simple shapes, flat readable shading, minimal surface detail, toy-figure proportions, bright even lighting, no photoreal textures' : 'clean AAA game-character render — soft even lighting, gentle natural shadows, low-contrast shading, subtle rim light only, no harsh dramatic shadows, no heavy atmospheric haze, balanced exposure, friendly approachable look, ArtStation quality' }
- 2-3 sentences, highly descriptive
- End with: "${ ['wolf','snow_leopard','monkey','eagle','fox','bear','tiger','owl','yourself'].includes(avatarKey) ? 'shot on 35mm film, natural light, candid documentary style, soft realistic shadows, subtle film grain, full body framing' : avatarKey === 'animated' ? 'stylized 3D character render, Pixar / Fortnite style, low-detail toy figure, smooth shading, clean background, full body' : 'clean AAA game render, soft balanced lighting, gentle shadows, low contrast, subtle rim light, natural exposure, approachable friendly tone, full body, ultra detailed' }"

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

const HUMAN_AVATARS = new Set(['yourself','animated','link','kratos','mario','master_chief','geralt','aragorn','joker','neo','mickey','arthas','illidan','sylvanas']);

// InstantID — generates image WITH the user's face identity preserved.
// Per-avatar weights: yourself needs high identity, iconic characters
// need the character look to dominate (small facial echo only).
const INSTANT_ID_WEIGHTS = {
  yourself: { ip: 0.8, cn: 0.5 },
  animated: { ip: 0.55, cn: 0.35 },
};
const ICONIC_WEIGHTS = { ip: 0.55, cn: 0.35 };

async function generateWithFace(prompt, faceBase64, faceMime, avatarKey) {
  const faceDataUrl = `data:${faceMime};base64,${faceBase64}`;
  const INSTANT_ID_VERSION = '2e4785a4d80dadf580077b2244c8d7c05d8e3faac04a04c02d8e099dd2876789';
  const w = INSTANT_ID_WEIGHTS[avatarKey] || ICONIC_WEIGHTS;
  const startRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: INSTANT_ID_VERSION, input: {
      image: faceDataUrl,
      prompt: prompt + ', smooth flattering skin, soft even face lighting, gentle portrait, no harsh facial shadows',
      negative_prompt: 'harsh wrinkles, deep facial lines, emphasized skin texture, uneven blotchy skin, harsh contrast shadows on face, heavy pores, exaggerated features, low quality, blurry, deformed, ugly, bad anatomy, multiple faces, extra limbs, realistic human face overriding the character, plain everyday clothing where iconic outfit should be',
      num_inference_steps: 30,
      guidance_scale: 5,
      ip_adapter_scale: w.ip,
      controlnet_conditioning_scale: w.cn,
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
      imageUrl = await generateWithFace(claudeResult.flux_prompt, imageBase64, imageMime, avatarKey);
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

// ── 3D generation (Hunyuan3D-2) ───────────────────────────
async function generate3D(imageUrl) {
  const startRes = await fetch('https://api.replicate.com/v1/models/ndreca/hunyuan3d-2/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: {
      image: imageUrl,
      steps: 30,
      guidance_scale: 5.5,
      octree_resolution: 256,
      remove_background: true,
    } })
  });
  const pred = await startRes.json();
  if (!pred.id) throw new Error('Hunyuan3D start error: ' + JSON.stringify(pred));
  console.log('Hunyuan3D started:', pred.id);
  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
      headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}` }
    });
    const result = await poll.json();
    if (result.status === 'succeeded') {
      const out = result.output;
      // Output can be {mesh:"..."} or a URL string or array
      if (typeof out === 'string') return out;
      if (Array.isArray(out)) return out[0];
      if (out && out.mesh) return out.mesh;
      if (out && out.glb) return out.glb;
      return null;
    }
    if (result.status === 'failed' || result.status === 'canceled') {
      throw new Error('Hunyuan3D ' + result.status + ': ' + result.error);
    }
  }
  throw new Error('Hunyuan3D timed out');
}

app.post('/start-3d/:id', async (req, res) => {
  const job = jobs[req.params.id];
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (!job.image_url) return res.status(400).json({ error: 'No image yet' });
  if (job.glb_url) return res.json({ glb_url: job.glb_url });
  if (job.status_3d === 'generating') return res.json({ status_3d: 'generating' });
  job.status_3d = 'generating';
  (async () => {
    try {
      const glb = await generate3D(job.image_url);
      job.glb_url = glb;
      job.status_3d = 'done';
      console.log('3D done:', glb);
    } catch (e) {
      job.status_3d = 'error';
      job.error_3d = e.message;
      console.error('3D error:', e);
    }
  })();
  res.json({ status_3d: 'generating' });
});

// Proxy GLB through our origin (CORS + nicer URL for <model-viewer>)
app.get('/glb', async (req, res) => {
  const url = req.query.url;
  if (!url || !/^https:\/\/replicate\.delivery\//.test(url)) return res.status(400).send('bad url');
  try {
    const upstream = await fetch(url);
    if (!upstream.ok) return res.status(502).send('upstream error');
    res.setHeader('Content-Type', 'model/gltf-binary');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (e) {
    res.status(500).send('proxy error');
  }
});

app.get('/download', async (req, res) => {
  const url = req.query.url;
  if (!url || !/^https:\/\/replicate\.delivery\//.test(url)) return res.status(400).send('bad url');
  try {
    const upstream = await fetch(url);
    if (!upstream.ok) return res.status(502).send('upstream error');
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Content-Disposition', 'attachment; filename="AvatarMe.jpg"');
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (e) {
    res.status(500).send('proxy error');
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = 3001;
app.listen(PORT, () => console.log(`✅ AvatarMe running on http://localhost:${PORT}`));
