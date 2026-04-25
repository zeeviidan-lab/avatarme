import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(l => {
    const m = l.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
}

const TOKEN = process.env.REPLICATE_API_TOKEN;
if (!TOKEN) { console.error('No REPLICATE_API_TOKEN'); process.exit(1); }

const subjects = [
  // Humans — bank cards
  { key:'yourself',     prompt:'Cinematic candid portrait of an unidentifiable everyday person facing the camera, soft natural overcast daylight, clean modern casual outfit, neutral grey-tan blurred urban background, shallow depth of field, professional photography, Inter typography aesthetic, calm confident energy — generic stock-style headshot suitable as an app placeholder' },
  { key:'animated',     prompt:'High-end 2D animated TV-series character portrait of a generic stylized hero, Netflix Stranger Things animated style / Arcane / Blood of Zeus quality, painterly cel-shading, defined ink-line silhouettes, semi-realistic stylized face with crisp eye highlights, painted soft cinematic backdrop, generic original character, calm confident expression — looks like an official key frame from a high-end animated series' },
  // Animals — tight face only
  { key:'wolf',         prompt:'Tight close-up headshot portrait of a real arctic wolf, face and head only filling the frame, intense piercing blue eyes, detailed fur texture, soft natural overcast light, shallow depth of field, professional wildlife photography, documentary style, 35mm lens, subtle background bokeh of snow' },
  { key:'snow_leopard', prompt:'Tight close-up headshot portrait of a real snow leopard, face and head only filling the frame, pale green eyes, detailed spotted fur, soft mountain light, shallow depth of field, professional wildlife photography, documentary style, 35mm lens, subtle background bokeh of rocks and snow' },
  { key:'monkey',       prompt:'Tight close-up headshot portrait of a japanese macaque monkey, face and head only filling the frame, thoughtful curious eyes, detailed fur, soft natural forest light, shallow depth of field, professional wildlife photography, documentary style, 35mm lens, subtle green background bokeh' },
  { key:'eagle',        prompt:'Tight close-up headshot portrait of a real golden eagle, face and head only filling the frame, sharp amber eyes, detailed feather texture, soft natural light, shallow depth of field, professional wildlife photography, documentary style, 35mm lens, subtle sky background bokeh' },
  { key:'fox',          prompt:'Tight close-up headshot portrait of a real red fox, face and head only filling the frame, amber eyes, detailed orange fur, soft natural light, shallow depth of field, professional wildlife photography, documentary style, 35mm lens, subtle forest background bokeh' },
  { key:'bear',         prompt:'Tight close-up headshot portrait of a real grizzly bear, face and head only filling the frame, dark intense eyes, detailed thick fur, soft natural light, shallow depth of field, professional wildlife photography, documentary style, 35mm lens, subtle wilderness background bokeh' },
  { key:'tiger',        prompt:'Tight close-up headshot portrait of a real white bengal tiger, face and head only filling the frame, piercing ice-blue eyes, detailed white and black striped fur, soft natural light, shallow depth of field, professional wildlife photography, documentary style, 35mm lens, subtle dark background bokeh' },
  { key:'owl',          prompt:'Tight close-up headshot portrait of a real great horned owl, face and head only filling the frame, huge yellow eyes, detailed feather texture, soft natural light, shallow depth of field, professional wildlife photography, documentary style, 35mm lens, subtle dark forest background bokeh' },

  // Iconic characters — stylized game-render
  { key:'link',         prompt:'Epic cinematic portrait of Link from The Legend of Zelda, green tunic, pointed elf ears, blonde hair, blue eyes, determined expression, detailed face close-up headshot, Unreal Engine 5 game render, volumetric rim lighting, bokeh, fantasy hero' },
  { key:'kratos',       prompt:'Epic cinematic portrait of Kratos from God of War, pale skin with red tattoo across face, intense angry eyes, beard, scar over eye, detailed face close-up headshot, Unreal Engine 5 game render, dramatic rim lighting, volumetric smoke, warrior' },
  { key:'mario',        prompt:'Pixar 3D animated character portrait of Super Mario, red cap with M, thick black mustache, big round nose, cheerful expression, blue eyes, detailed face close-up headshot, Nintendo style 3D render, soft studio lighting, colorful background bokeh' },
  { key:'master_chief', prompt:'Epic cinematic portrait of Master Chief from Halo, green spartan armor helmet with gold reflective visor, detailed face and helmet close-up headshot, Unreal Engine 5 game render, dramatic rim lighting, volumetric light, sci-fi hero' },
  { key:'geralt',       prompt:'Epic cinematic portrait of Geralt of Rivia from The Witcher, white long hair, yellow cat eyes, scars on face, weathered expression, detailed face close-up headshot, Unreal Engine 5 game render, dramatic rim lighting, dark fantasy bokeh' },
  { key:'aragorn',      prompt:'Epic cinematic portrait of Aragorn from Lord of the Rings, long dark hair, beard, noble weary expression, blue-green eyes, detailed face close-up headshot, cinematic film still, soft natural light, shallow depth of field, medieval fantasy bokeh' },
  { key:'joker',        prompt:'Epic cinematic portrait of The Joker, white face paint, green messy hair, red smile, wild manic eyes, detailed face close-up headshot, dark cinematic lighting, dramatic shadows, gothic bokeh' },
  { key:'neo',          prompt:'Epic cinematic portrait of Neo from The Matrix, black sunglasses, short dark hair, stoic expression, detailed face close-up headshot, cinematic film still, green digital rain bokeh background, dramatic side lighting' },
  { key:'mickey',       prompt:'Classic Disney 3D Pixar-style portrait of Mickey Mouse, black round ears, cheerful grin, big round eyes, detailed face close-up headshot, bright colorful studio lighting, soft pastel bokeh background' },
  { key:'arthas',       prompt:'Epic cinematic portrait of Arthas the Lich King from World of Warcraft, spiked ice crown helmet, icy blue glowing eyes, pale undead face, detailed face and helmet close-up headshot, Blizzard game render style, dramatic rim lighting, frost and snow bokeh' },
  { key:'illidan',      prompt:'Epic cinematic portrait of Illidan Stormrage from World of Warcraft, demon hunter, horned skull, long green-black hair, glowing green eyes behind blindfold, purple tattoos, detailed face close-up headshot, Blizzard game render style, dramatic rim lighting, fel green bokeh' },
  { key:'sylvanas',     prompt:'Epic cinematic portrait of Sylvanas Windrunner from World of Warcraft, banshee queen, long white hair, glowing red eyes, pale elf features, pointed ears, fierce expression, detailed face close-up headshot, Blizzard game render style, dramatic rim lighting, dark shadow bokeh' },
  { key:'yellow_toon',  prompt:'Generic original character in classic 90s American animated sitcom style — flat bright yellow skin, large round white eyes with small black pupils, prominent overbite, simple bold black outlines, flat 2D vector cartoon, primary colors, no shading, simple cel-animation look, generic suburban backdrop. Original character — do NOT replicate any specific copyrighted show, character, or place.' },
  { key:'martian',      prompt:'Cinematic sci-fi portrait of a Martian alien from Mars, smooth green-grey alien skin, large oval black eyes, slim humanoid head with subtle ridges, sleek minimalist alien jumpsuit, close-up headshot, AAA game render quality, soft balanced lighting, subtle rim light, rust-red Martian desert background bokeh, pale orange sky' },
];

async function generate(prompt) {
  const start = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Token ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { prompt, aspect_ratio: '1:1', num_outputs: 1, output_format: 'jpg', output_quality: 92, num_inference_steps: 4 } })
  });
  const startJson = await start.json();
  if (start.status >= 400) throw new Error(JSON.stringify(startJson));
  let pred = startJson;
  for (let i=0; i<40; i++) {
    await new Promise(r => setTimeout(r, 1500));
    const r = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, { headers: { 'Authorization': `Token ${TOKEN}` } });
    pred = await r.json();
    if (pred.status === 'succeeded') return Array.isArray(pred.output) ? pred.output[0] : pred.output;
    if (pred.status === 'failed' || pred.status === 'canceled') throw new Error('Prediction ' + pred.status + ': ' + pred.error);
  }
  throw new Error('timeout');
}

const results = {};
const outPath = path.resolve(__dirname, 'portraits.json');
const imgDir = path.resolve(__dirname, '../frontend/portraits');
fs.mkdirSync(imgDir, { recursive: true });

for (const s of subjects) {
  const localPath = path.join(imgDir, `${s.key}.jpg`);
  if (fs.existsSync(localPath)) { console.log('skip', s.key); results[s.key] = `portraits/${s.key}.jpg`; continue; }
  console.log('→', s.key);
  try {
    const url = await generate(s.prompt);
    const imgRes = await fetch(url);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(localPath, buf);
    results[s.key] = `portraits/${s.key}.jpg`;
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    console.log('  ✓ saved', localPath, `(${buf.length} bytes)`);
    await new Promise(r => setTimeout(r, 11000));
  } catch (e) {
    console.error('  ✗', s.key, e.message);
    await new Promise(r => setTimeout(r, 20000));
  }
}

console.log('DONE. Saved:', outPath);
console.log(JSON.stringify(results, null, 2));
