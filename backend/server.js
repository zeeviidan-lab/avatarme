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
  monkey:       { name: 'Wise Monkey',  animal: 'japanese macaque monkey',           base: 'large bare flesh-pink face FILLING THE FRAME and FACING THE CAMERA DIRECTLY (front-facing, nearly head-on, both eyes clearly visible, symmetric), surrounded by a thick fur ruff, large warm intelligent forward-facing eyes with crisp catchlights, nostrils and mouth clearly visible at human-readable proportions, the bare facial skin readable as a near-human face, nimble hands',          env: 'dense ancient jungle canopy, shafts of soft sunlight piercing through enormous tropical leaves, hanging vines, distant waterfall through mist, gentle even light on the face (no harsh side shadows)' },
  eagle:        { name: 'Golden Eagle', animal: 'golden eagle',     base: 'sharp curved talons, rich brown and gold feathers, fierce amber eyes, broad wingspan',  env: 'standing on a rocky mountain peak above the clouds, vast open sky, distant mountain range bathed in golden sunrise light, wind-swept environment' },
  fox:          { name: 'Red Fox',      animal: 'red fox',          base: 'vibrant fiery red and white fur, cunning amber eyes, sleek slender build, bushy tail',  env: 'misty autumn forest at dawn, golden and crimson fallen leaves on the ground, soft morning fog between ancient oak trees, dew on the grass' },
  bear:         { name: 'Grizzly Bear', animal: 'grizzly bear',     base: 'enormous powerful frame, thick dark-brown fur, commanding presence, small dark eyes',   env: 'rushing salmon river in the Pacific Northwest, dense green pine forest, dramatic overcast sky, water splashing around massive rocks' },
  tiger:        { name: 'White Tiger',  animal: 'white tiger',      base: 'pure white fur with charcoal black stripes, intense ice-blue eyes, raw muscular power',  env: 'ancient bamboo forest in morning fog, shafts of pale green light filtering through tall bamboo, scattered white flower petals on the ground' },
  owl:          { name: 'Great Owl',    animal: 'great horned owl', base: 'huge luminous amber eyes, mottled brown-grey feathers, broad silent wings, wise expression', env: 'old-growth forest at night, full moon visible through dark twisted branches, fireflies glowing in the darkness, thick ancient tree trunk' },
  yourself:   { name: 'Just Me',    animal: 'regular contemporary person',  base: 'natural realistic features, smooth flattering skin, casual modern clothing, relaxed confident expression, authentic everyday look — no costume, no theme', env: 'bright overcast outdoor setting or open shade on a quiet city street, soft diffused daylight, gentle out-of-focus background, clean soft portrait lighting — no direct sun, no harsh shadows' },
  animated:   { name: 'Animated Me', animal: '2D animated TV-series character version of the person, in the visual style of the Netflix Stranger Things animated series (Flying Bark Productions) — modern western animation, semi-realistic stylized 2D, comparable to Arcane / Blood of Zeus', base: 'clean confident line work, painterly cel-shaded skin with soft gradient shadows, slightly stylized but anatomically grounded face proportions, expressive eyes with crisp highlights, hair drawn as defined shape clusters with painted highlights, recognizable likeness preserved (same face shape, hair, beard, skin tone), outfit chosen to fit their personality, looks like an official key frame from a high-end animated series', env: 'cinematic painted backdrop in the same animation style — subtle environmental scene matching their personality, hand-painted depth, soft atmospheric haze, restrained color palette, dramatic but not theatrical lighting' },
  // Animated animals — 2D animated TV-series style matching "Animated Me"
  // (Netflix Stranger Things animated / Arcane / Blood of Zeus). Painterly
  // cel-shaded 2D, NOT 3D Pixar. Semi-anthropomorphic so face-swap works.
  cartoon_wolf:   { name: 'Animated Wolf',   animal: '2D animated TV-series wolf character in Netflix Stranger Things / Arcane style', base: 'painterly cel-shaded soft white-grey fur with defined ink-line silhouette, large expressive forward-facing eyes with crisp highlights, semi-anthropomorphic stylized face with human-readable proportions (eyes/nose/mouth at human spacing), calm confident expression, optional simple outfit (hoodie or vest) fitting personality, looks like an official key frame from a high-end animated series', env: 'painted snowy pine forest at golden hour, hand-painted depth, soft atmospheric haze, restrained color palette, animated TV-series backdrop' },
  cartoon_fox:    { name: 'Animated Fox',    animal: '2D animated TV-series red fox character in Netflix Stranger Things / Arcane style', base: 'painterly cel-shaded vibrant orange-red fur with white belly, defined ink-line silhouette, large expressive forward-facing eyes with crisp highlights, semi-anthropomorphic stylized face with human-readable proportions, sharp clever expression, optional simple casual outfit, looks like a key frame from a high-end animated series', env: 'painted autumn forest at warm afternoon light, hand-painted depth, restrained color palette, animated TV-series backdrop' },
  cartoon_bear:   { name: 'Animated Bear',   animal: '2D animated TV-series brown bear character in Netflix Stranger Things / Arcane style', base: 'painterly cel-shaded soft brown fur with defined ink-line silhouette, large expressive forward-facing eyes with crisp highlights, semi-anthropomorphic stylized face with human-readable proportions, warm steady expression, optional simple casual outfit, looks like a key frame from a high-end animated series', env: 'painted mountain meadow at sunset, hand-painted depth, restrained color palette, animated TV-series backdrop' },
  cartoon_owl:    { name: 'Animated Owl',    animal: '2D animated TV-series owl character with a flat round face in Netflix Stranger Things / Arcane style', base: 'painterly cel-shaded mottled brown-grey feathers with defined ink-line silhouette, huge round forward-facing eyes with crisp highlights, semi-anthropomorphic stylized face with human-readable proportions, thoughtful watchful expression, optional simple casual sweater, looks like a key frame from a high-end animated series', env: 'painted old library at dusk with warm lamp glow, floating dust motes, hand-painted depth, restrained color palette, animated TV-series backdrop' },
  cartoon_tiger:  { name: 'Animated Tiger',  animal: '2D animated TV-series tiger character in Netflix Stranger Things / Arcane style', base: 'painterly cel-shaded vivid orange fur with bold black stripes, defined ink-line silhouette, large expressive forward-facing eyes with crisp highlights, semi-anthropomorphic stylized face with human-readable proportions, intense confident expression, optional simple casual outfit, looks like a key frame from a high-end animated series', env: 'painted lush jungle clearing with shafts of warm light, hand-painted depth, restrained color palette, animated TV-series backdrop' },
  cartoon_monkey: { name: 'Animated Monkey', animal: '2D animated TV-series macaque character in Netflix Stranger Things / Arcane style', base: 'painterly cel-shaded flesh-pink face surrounded by warm brown fur, defined ink-line silhouette, large expressive forward-facing eyes with crisp highlights, semi-anthropomorphic stylized face with human-readable proportions, curious clever expression, optional simple casual outfit, looks like a key frame from a high-end animated series', env: 'painted tropical jungle canopy with shafts of golden light, hand-painted depth, restrained color palette, animated TV-series backdrop' },
  yellow_toon: { name: 'Yellow Toon Me', animal: 'flat 2D cartoon character version of the person, in the classic 90s American prime-time animated sitcom visual style', base: 'flat bright yellow skin, simple bold black outlines, large round white eyes with small black pupils, prominent overbite mouth, four fingers per hand, simplified two-dimensional cartoon proportions, hair drawn as a single solid shape matching the person\'s real hairstyle and color, recognizable likeness preserved through hair shape, beard if any, glasses if worn, and clothing color', env: 'generic small American suburban backdrop — quiet residential street with simple flat houses, picket fences, neatly trimmed lawns, blue sky with a few simple white clouds — flat cartoon vector backdrop, bright primary colors, simple shapes (NO real-world place names, NO TV-show locations)' },
  martian:     { name: 'Martian Me',    animal: 'Martian alien version of the person from the planet Mars',                base: 'smooth green or grey-green skin, large oval black or amber alien eyes, slim humanoid build, subtle ridges or markings on the head, sleek minimalist alien jumpsuit, the user\'s recognizable face structure echoed in the alien skull (same overall face shape, brow line, jaw, beard pattern as facial markings/ridges, hair pattern as crest or dorsal ridge if any) — clearly an alien, but unmistakably YOU as an alien', env: 'rust-red Martian desert under a pale orange sky, distant dusty mountains, two small moons (Phobos and Deimos) in the sky, futuristic alien outpost or crashed pod in the distance, fine red dust in the air' },
};

const BACKGROUNDS = {
  auto:       null,
  city:       'modern city street at golden hour, warm out-of-focus storefronts and signs in the distance, gentle sunset light, urban energy',
  nature:     'soft forest clearing, dappled sunlight through leaves, gentle green out-of-focus foliage, peaceful natural atmosphere',
  studio:     'clean professional photo studio, smooth seamless gradient backdrop in muted neutral tones, soft balanced studio lighting',
  cinematic:  'moody cinematic environment with soft volumetric haze, restrained color palette, dramatic but balanced atmospheric lighting, shallow depth of field',
  beach:      'tranquil beach at sunset, soft golden light on the sand, gentle out-of-focus ocean waves, warm horizon glow',
  abstract:   'minimal abstract backdrop, soft pastel gradient with gentle out-of-focus geometric shapes, calm modern atmosphere',
  night:      'atmospheric night street with soft glowing neon and bokeh city lights, cool blue and warm magenta highlights, cinematic mood',
};

async function analyzeAndBuildPrompt(imageBase64, imageMime, gameAnswers, rankOrder, avatarKey, bgKey) {
  const av = AVATARS[avatarKey];
  const bgOverride = BACKGROUNDS[bgKey] || null;
  const env = bgOverride || av.env;
  const userContext = `Avatar chosen: ${av.animal}
Reaction game answers: ${gameAnswers}
Trait ranking (most to least important): ${rankOrder}
${imageBase64 ? 'Face photo: provided (analyze expression, energy, features)' : 'No face photo provided'}`;

  const systemPrompt = `You are AvatarMe's AI engine. Analyze user personality data and generate:
1. A deeply personal description of why this avatar matches them
2. A highly detailed FLUX image prompt for a unique full body photorealistic ${av.animal} character

Image prompt rules:
- ULTRA-IMPORTANT FRAMING: this MUST be a FULL BODY shot — head to toe visible, wide framing, the entire figure standing within the frame from feet to top of head, with clear space around the body. NEVER a headshot, NEVER a bust crop, NEVER waist-up. The flux_prompt must explicitly contain the words "full body, head to toe, wide framing, full standing pose, feet visible".
- Candid full body portrait of a ${av.animal} (${av.base}), captured in a natural unposed moment — not a hero pose, not posed for the camera
- Setting: ${env} — described in plain natural language, like a real place that exists
- Subtle personality cues only: gaze, posture, micro-expression, the way light falls. Avoid theatrical drama.
- Composition: off-center framing, natural camera angle at eye level or slightly ABOVE (never from below — low angles distort faces unflatteringly), shallow depth of field, environment visible but not overwhelming
- ${ ['wolf','snow_leopard','monkey','eagle','fox','bear','tiger','owl'].includes(avatarKey) ? `REAL ANIMAL — absolutely no clothing, no outfit, no accessories — natural animal body only, like a wildlife documentary still.${avatarKey === 'monkey' ? ' CRITICAL CAMERA: the macaque MUST be facing the camera directly (front-on, head straight to lens, both eyes equally visible, face symmetric in frame, NOT in profile, NOT three-quarter, NOT looking away). Face occupies a large portion of the upper frame even though framing is full body.' : ''}${imageBase64 ? avatarKey === 'monkey' ? ` SPIRIT-ANIMAL ECHO (MANDATORY — must appear explicitly in the flux_prompt): the japanese macaque has a bare flesh-pink face surrounded by a fur ruff — this is the most human-readable animal in the bank, so the resemblance must be obvious. Study the user's photo and write into the flux_prompt: (a) the macaque's facial skin tone matches the user's actual skin tone (name it: "warm olive", "fair pink", "deep brown"), (b) the surrounding fur ruff/cheek tufts/crown match the user's hair and beard — color, density and pattern (e.g. "thick salt-and-pepper fur ruff framing the face like a full beard", "short reddish-brown crown matching cropped auburn hair", "bald pink crown with grey side tufts"), (c) eye color named explicitly (warm brown, amber, hazel), (d) the same brow shape and expression (heavy thoughtful brow, gentle calm gaze, sharp alert focus). The result must read as a real macaque that anyone seeing the user's photo would instantly recognise.` : ` SPIRIT-ANIMAL ECHO (MANDATORY — must appear explicitly in the flux_prompt): study the user's face photo and pick specific, visible features — their actual eye color (name it: "amber", "warm brown", "green-grey"), their hair/beard color and pattern (name it: "salt-and-pepper grey muzzle and chest", "sandy-brown coat with grey around the eyes"), their expression (calm, intense, gentle). The animal's fur/feather coloring and facial markings MUST directly reflect these — e.g. a wolf with the user's salt-and-pepper grey around its muzzle and warm brown eyes. These must be written into the flux_prompt as concrete visual details, not as subtext. The animal still reads as a real animal — but one that visibly resembles the person.` : ''}` : avatarKey.startsWith('cartoon_') ? `2D ANIMATED TV-SERIES ANIMAL CHARACTER — a stylized 2D animal in the SAME visual language as Netflix's Stranger Things animated series / Arcane / Blood of Zeus. Painterly cel-shaded, defined ink-line silhouettes, semi-anthropomorphic with human-readable face proportions (eyes/nose/mouth spaced like a human face). Forward-facing, looking at camera, large clearly readable eyes. NOT 3D, NOT Pixar, NOT photoreal — a 2D animated character.${imageBase64 ? ' The face is intentionally human-proportioned so the user\'s likeness can later be face-swapped onto it — keep the head front-facing and well lit.' : ''}` : 'ICONIC CHARACTER — the character look (costume, signature features, iconic hair/helmet/color scheme) MUST be fully rendered. The user\'s face should carry recognizable identity (bone structure, beard/hair, expression) but wearing the complete iconic outfit of this character — never their regular clothes with just an accessory.' }
- Style: ${ ['wolf','snow_leopard','monkey','eagle','fox','bear','tiger','owl','yourself'].includes(avatarKey) ? 'documentary photography, soft diffused light (overcast sky, open shade, or soft window light — NEVER direct harsh sun), gentle flattering shadows, fine film grain, looks like it was actually photographed' : avatarKey === 'animated' ? 'high-end 2D animated TV-series still — Netflix Stranger Things animated series style (Flying Bark Productions), Arcane / Blood of Zeus quality, painterly cel-shading, defined ink-line silhouettes, soft watercolor-style ambient shadows, semi-realistic stylized faces with crisp eye highlights, painted background with depth — NOT 3D, NOT Pixar, NOT photoreal' : avatarKey.startsWith('cartoon_') ? 'high-end 2D animated TV-series style — Netflix Stranger Things animated series (Flying Bark Productions), Arcane / Blood of Zeus quality, painterly cel-shading, defined ink-line silhouettes, soft watercolor-style ambient shadows, semi-realistic stylized faces with crisp eye highlights, painted background with depth — NOT 3D, NOT Pixar, NOT photoreal' : avatarKey === 'yellow_toon' ? 'classic 90s American prime-time animated sitcom visual style — flat 2D vector cartoon, bright yellow skin, bold black ink outlines, primary-color flat fills, no gradients, no shading beyond simple flat tones, simple cel-animation aesthetic — NOT 3D, NOT realistic, NOT painterly. Generic style only — do NOT name or replicate any specific TV show, character, or location' : avatarKey === 'martian' ? 'cinematic sci-fi character portrait — clean AAA render of an alien being, soft balanced lighting, subtle rim light, gentle atmospheric red dust, restrained color palette, looks like concept art for a serious sci-fi film' : 'clean AAA game-character render — soft even lighting, gentle natural shadows, low-contrast shading, subtle rim light only, no harsh dramatic shadows, no heavy atmospheric haze, balanced exposure, friendly approachable look, ArtStation quality' }
- 2-3 sentences, highly descriptive
- End with: "${ ['wolf','snow_leopard','monkey','eagle','fox','bear','tiger','owl','yourself'].includes(avatarKey) ? 'shot on 35mm film, natural light, candid documentary style, soft realistic shadows, subtle film grain, full body framing' : avatarKey === 'animated' ? 'official animated TV series key frame, Netflix Stranger Things animated style, Flying Bark Productions, Arcane-quality 2D, painterly cel-shading, ink-line silhouettes, painted background, full body' : avatarKey.startsWith('cartoon_') ? 'official animated TV series key frame, Netflix Stranger Things animated style, Flying Bark Productions, Arcane-quality 2D, painterly cel-shading, ink-line silhouettes, painted background, full body' : avatarKey === 'yellow_toon' ? 'classic 90s American animated sitcom style, flat yellow skin, bold black outlines, simple cel cartoon, full body' : avatarKey === 'martian' ? 'cinematic sci-fi alien portrait, clean AAA render, ArtStation quality, full body, ultra detailed' : 'clean AAA game render, soft balanced lighting, gentle shadows, low contrast, subtle rim light, natural exposure, approachable friendly tone, full body, ultra detailed' }"

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
    body: JSON.stringify({ input: { prompt: 'FULL BODY SHOT, head to toe, wide framing, full standing pose, feet visible, entire figure within the frame — ' + fluxPrompt, aspect_ratio: '2:3', output_format: 'jpg', output_quality: 95 } })
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

// Human avatars route through PuLID-FLUX: identity-preserving FLUX gen
// at portrait dimensions (768×1280) — strong identity AND full body in
// one pass. Replaces both the old InstantID path (couldn't do full body)
// and the FLUX+face-swap path (face too small in full-body shot for
// face-swap to land accurately).
const HUMAN_AVATARS = new Set(['yourself','animated','yellow_toon','martian']);

// PuLID-FLUX — identity-preserving FLUX. Strong likeness + full body
// in one pass at configurable portrait dimensions. id_weight controls
// how strongly identity overrides the prompt's stylization:
//   yourself: highest (just be them)
//   animated/martian: medium (let the style stylize the face)
//   yellow_toon: lower still (flat 2D needs to dominate face geometry)
const PULID_VERSION = '8baa7ef2255075b46f4d91cd238c21d31181b3e6a864463f967960bb0112525b';
const PULID_ID_WEIGHTS = {
  yourself:    1.2,
  animated:    1.0,
  martian:     0.9,
  yellow_toon: 0.8,
};

async function generateWithFace(prompt, faceBase64, faceMime, avatarKey) {
  const faceDataUrl = `data:${faceMime};base64,${faceBase64}`;
  const idWeight = PULID_ID_WEIGHTS[avatarKey] ?? 1.0;
  const startRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: PULID_VERSION, input: {
      main_face_image: faceDataUrl,
      width: 768,
      height: 1280,
      prompt: 'FULL BODY SHOT, head to toe, wide framing, full standing pose, feet visible, the entire figure standing within the frame from feet to top of head with clear space around the body — ' + prompt,
      negative_prompt: 'cropped at waist, cropped at chest, headshot, bust crop, portrait crop, extreme close-up of face, face fills the frame, body cut off, missing feet, missing legs, missing knees, distorted proportions, oversized head, tiny body, deformed body, multiple faces, extra limbs, low quality, blurry, deformed eyes, cross-eyed, asymmetric face, text, watermark',
      num_steps: 20,            // schema max is 20
      guidance_scale: 4,
      id_weight: idWeight,
      true_cfg: 1,
      output_format: 'jpg',
      output_quality: 92,
    } })
  });
  const prediction = await startRes.json();
  if (!prediction.id) { console.error('PuLID start error:', JSON.stringify(prediction)); return null; }
  console.log('PuLID started:', prediction.id, 'id_weight:', idWeight);

  for (let i = 0; i < 50; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}` }
    });
    const result = await pollRes.json();
    if (result.status === 'succeeded') {
      console.log('PuLID succeeded');
      return Array.isArray(result.output) ? result.output[0] : result.output;
    }
    if (result.status === 'failed') { console.error('PuLID failed:', result.error); return null; }
  }
  console.error('PuLID timed out');
  return null;
}

// Run the full pipeline in background
async function runJob(jobId, imageBase64, imageMime, gameAnswers, rankOrder, avatarKey, bgKey) {
  try {
    jobs[jobId].status = 'analyzing';
    const claudeResult = await analyzeAndBuildPrompt(imageBase64, imageMime, gameAnswers, rankOrder, avatarKey, bgKey);

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

    // For supported animals (macaque), face-swap the user's face onto
    // the FLUX-generated animal portrait. Honest "you-as-the-animal"
    // result that text-to-image alone can't produce.
    if (imageUrl && imageBase64 && FACESWAP_SUPPORTED.has(avatarKey)) {
      try {
        const faceDataUrl = `data:${imageMime};base64,${imageBase64}`;
        const swapped = await faceSwap(imageUrl, faceDataUrl);
        if (swapped) {
          console.log('Face-swap applied to', avatarKey);
          imageUrl = swapped;
        } else {
          console.log('Face-swap failed for', avatarKey, '— falling back to original');
        }
      } catch (e) {
        console.error('Face-swap exception:', e);
      }
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
  const bgKey = req.body.bg || 'auto';
  const gameAnswers = req.body.q1 || '';
  const rankOrder = req.body.q2 || '';

  let imageBase64 = null, imageMime = null;
  if (req.file) {
    imageBase64 = fs.readFileSync(req.file.path).toString('base64');
    imageMime = req.file.mimetype;
    fs.unlinkSync(req.file.path);
  }

  jobs[jobId] = { status: 'starting' };
  runJob(jobId, imageBase64, imageMime, gameAnswers, rankOrder, avatarKey, bgKey);

  res.json({ jobId });
});

// GET /status/:id — poll for result
app.get('/status/:id', (req, res) => {
  const job = jobs[req.params.id];
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// ── 3D generation (Hunyuan3D-2) ───────────────────────────
// ── Face-swap (lucataco/faceswap) ──
// Used to swap user's face onto AI-generated animal portraits where the
// target has human-readable facial landmarks (e.g. macaque). Won't work
// on canids/birds — those keep the spirit-pairing UX instead.
const FACESWAP_VERSION = '9a4298548422074c3f57258c5d544497314ae4112df80d116f0d2109e843d20d';
const FACESWAP_FALLBACK_VERSION = 'cff87316e31787df12002c9e20a78a017a36cb31fde9862d8dedd15ab29b7288'; // xiankgx/face-swap
// Face-swap pipeline (FLUX → swap user's face on top). Used for animal
// targets with human-readable faces (cartoons, macaque). Human avatars
// are NOT here — they go through PuLID-FLUX which bakes in identity
// directly. Real wildlife (wolf/eagle/etc.) stay out — no human landmarks.
const FACESWAP_SUPPORTED = new Set([
  'monkey',
  'cartoon_wolf','cartoon_fox','cartoon_bear','cartoon_owl','cartoon_tiger','cartoon_monkey',
]);

async function pollPrediction(id, sleepMs, maxIters, label) {
  for (let i = 0; i < maxIters; i++) {
    await new Promise(r => setTimeout(r, sleepMs));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}` }
    });
    const result = await poll.json();
    if (result.status === 'succeeded') {
      console.log(label + ' succeeded');
      return Array.isArray(result.output) ? result.output[0] : result.output;
    }
    if (result.status === 'failed' || result.status === 'canceled') {
      console.error(label + ' ' + result.status + ':', result.error);
      return null;
    }
  }
  console.error(label + ' timed out');
  return null;
}

async function faceSwapLucataco(targetImageUrl, sourceFaceDataUrl) {
  const startRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: FACESWAP_VERSION, input: {
      target_image: targetImageUrl,
      swap_image: sourceFaceDataUrl,
    } })
  });
  const pred = await startRes.json();
  if (!pred.id) { console.error('Lucataco face-swap start error:', JSON.stringify(pred)); return null; }
  console.log('Lucataco face-swap started:', pred.id);
  return pollPrediction(pred.id, 2000, 40, 'Lucataco face-swap');
}

async function faceSwapXiankgx(targetImageUrl, sourceFaceDataUrl) {
  // xiankgx uses source_image / target_image (NOT input_image/swap_image).
  // det_thresh:0.05 is more permissive than the 0.1 default — needed for
  // ambiguous faces like an AI-generated macaque.
  const startRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: FACESWAP_FALLBACK_VERSION, input: {
      source_image: sourceFaceDataUrl,
      target_image: targetImageUrl,
      det_thresh: 0.05,
      weight: 0.7,
    } })
  });
  const pred = await startRes.json();
  if (!pred.id) { console.error('Xiankgx face-swap start error:', JSON.stringify(pred)); return null; }
  console.log('Xiankgx face-swap started:', pred.id);
  const out = await pollPrediction(pred.id, 2000, 40, 'Xiankgx face-swap');
  // xiankgx returns {image: "..."} or a URL string
  if (out && typeof out === 'object' && out.image) return out.image;
  return out;
}

// cdingram/face-swap — third fallback. input_image=TARGET, swap_image=SOURCE.
const FACESWAP_THIRD_VERSION = 'd1d6ea8c8be89d664a07a457526f7128109dee7030fdac424788d762c71ed111';
async function faceSwapCdingram(targetImageUrl, sourceFaceDataUrl) {
  const startRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: FACESWAP_THIRD_VERSION, input: {
      input_image: targetImageUrl,
      swap_image: sourceFaceDataUrl,
    } })
  });
  const pred = await startRes.json();
  if (!pred.id) { console.error('Cdingram face-swap start error:', JSON.stringify(pred)); return null; }
  console.log('Cdingram face-swap started:', pred.id);
  return pollPrediction(pred.id, 2000, 40, 'Cdingram face-swap');
}

async function faceSwap(targetImageUrl, sourceFaceDataUrl) {
  const primary = await faceSwapLucataco(targetImageUrl, sourceFaceDataUrl);
  if (primary) return primary;
  console.log('Lucataco failed — trying xiankgx');
  const second = await faceSwapXiankgx(targetImageUrl, sourceFaceDataUrl);
  if (second) return second;
  console.log('Xiankgx failed — trying cdingram');
  return faceSwapCdingram(targetImageUrl, sourceFaceDataUrl);
}

const HUNYUAN3D_VERSION = '0602bae6db1ce420f2690339bf2feb47e18c0c722a1f02e9db9abd774abaff5d';
async function generate3D(imageUrl) {
  const startRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: HUNYUAN3D_VERSION, input: {
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

// ── Image-to-video (wan-2.2-i2v-fast) ──
const I2V_VERSION = '4eaf2b01d3bf70d8a2e00b219efeb7cb415855ad18b7dacdc4cae664a73a6eea';
const MOTION_PROMPTS = {
  walk:  'the subject walks confidently forward toward the camera, natural full-body stride, head and shoulders bobbing slightly, arms swinging, full body in frame, smooth motion, cinematic',
  run:   'the subject runs energetically toward the camera, arms pumping, legs lifting high, full-body motion, hair and clothing moving with the speed, smooth motion, cinematic',
  jump:  'the subject jumps up into the air with both arms raised in celebration, full body lifts off the ground, then lands softly, full body in frame, smooth motion, cinematic',
  dance: 'the subject dances joyfully, hips swaying, arms moving with rhythm, full body grooving, hair and clothing in motion, smooth motion, cinematic',
  wave:  'the subject smiles warmly and raises one hand to wave at the camera, friendly greeting gesture, gentle natural motion, full body visible, smooth motion, cinematic',
  spin:  'the subject spins around gracefully on the spot, full 360-degree turn, arms extended slightly, hair and clothing flowing with the rotation, full body in frame, smooth motion, cinematic',
};

async function generateVideo(imageUrl, motion) {
  const motionPrompt = MOTION_PROMPTS[motion] || MOTION_PROMPTS.walk;
  const startRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: I2V_VERSION, input: {
      image: imageUrl,
      prompt: motionPrompt,
      num_frames: 81,           // ~5s at 16fps
      frames_per_second: 16,
      resolution: '480p',
      go_fast: true,
    } })
  });
  const pred = await startRes.json();
  if (!pred.id) throw new Error('Video start error: ' + JSON.stringify(pred));
  console.log('Video started:', pred.id, 'motion:', motion);
  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
      headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}` }
    });
    const result = await poll.json();
    if (result.status === 'succeeded') {
      console.log('Video done');
      return Array.isArray(result.output) ? result.output[0] : result.output;
    }
    if (result.status === 'failed' || result.status === 'canceled') {
      throw new Error('Video ' + result.status + ': ' + result.error);
    }
  }
  throw new Error('Video timed out');
}

app.post('/start-video/:id', async (req, res) => {
  const job = jobs[req.params.id];
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (!job.image_url) return res.status(400).json({ error: 'No image yet' });
  const motion = (req.query.motion || req.body?.motion || 'walk').toString();
  // Per-motion cache so the user can try several different motions
  job.videos = job.videos || {};
  if (job.videos[motion]) return res.json({ video_url: job.videos[motion] });
  if (job.video_in_flight === motion) return res.json({ status_video: 'generating', motion });
  job.video_in_flight = motion;
  (async () => {
    try {
      const url = await generateVideo(job.image_url, motion);
      job.videos[motion] = url;
      job.video_in_flight = null;
    } catch (e) {
      job.video_in_flight = null;
      job.video_error = e.message;
      console.error('Video error:', e);
    }
  })();
  res.json({ status_video: 'generating', motion });
});

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

app.get('/video', async (req, res) => {
  const url = req.query.url;
  if (!url || !/^https:\/\/replicate\.delivery\//.test(url)) return res.status(400).send('bad url');
  try {
    const upstream = await fetch(url);
    if (!upstream.ok) return res.status(502).send('upstream error');
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'video/mp4');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
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
