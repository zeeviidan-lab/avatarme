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
  { key:'yourself',     prompt:'Minimalist abstract avatar placeholder — a smooth featureless humanoid silhouette bust facing forward, soft matte ceramic surface in warm neutral cream-beige tone, gentle studio gradient lighting, no facial features, no gender, no hair, completely abstract and anonymous, clean modern product-shot aesthetic, dark blurred neutral background, premium app icon style, Apple Human Interface design language' },
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
  { key:'martian',      prompt:'Cinematic portrait of a human Mars colonist astronaut, mostly human face with healthy weathered skin, calm focused eyes, short practical hair, wearing a sleek modern white-and-orange Mars expedition spacesuit with helmet ring open showing the face, subtle high-tech HUD reflections, close-up headshot, AAA cinematic film still, soft balanced lighting with warm rim light, rust-red Martian desert and pale dusty orange sky background bokeh, near-future SpaceX / Apple aesthetic — looks human, NOT an alien creature' },

  // Animated animals — 2D Stranger Things animated / Arcane style (matches Animated Me)
  { key:'cartoon_wolf',   prompt:'High-end 2D animated TV-series character portrait of a stylized wolf, Netflix Stranger Things animated style / Arcane / Blood of Zeus quality, painterly cel-shading, defined ink-line silhouettes, soft white-grey fur, large expressive forward-facing eyes with crisp highlights, semi-anthropomorphic stylized face with human-readable proportions, calm confident expression, painted snowy pine forest backdrop, official animated series key frame' },
  { key:'cartoon_fox',    prompt:'High-end 2D animated TV-series character portrait of a stylized red fox, Netflix Stranger Things animated style / Arcane / Blood of Zeus quality, painterly cel-shading, defined ink-line silhouettes, vibrant orange-red fur with white belly, large expressive forward-facing eyes with crisp highlights, semi-anthropomorphic stylized face with human-readable proportions, sharp clever expression, painted autumn forest backdrop, official animated series key frame' },
  { key:'cartoon_bear',   prompt:'High-end 2D animated TV-series character portrait of a stylized brown bear, Netflix Stranger Things animated style / Arcane / Blood of Zeus quality, painterly cel-shading, defined ink-line silhouettes, soft brown fur, large expressive forward-facing eyes with crisp highlights, semi-anthropomorphic stylized face with human-readable proportions, warm steady expression, painted mountain meadow backdrop at sunset, official animated series key frame' },
  { key:'cartoon_owl',    prompt:'High-end 2D animated TV-series character portrait of a stylized owl with a flat round face, Netflix Stranger Things animated style / Arcane / Blood of Zeus quality, painterly cel-shading, defined ink-line silhouettes, mottled brown-grey feathers, huge round forward-facing eyes with crisp highlights, semi-anthropomorphic stylized face with human-readable proportions, thoughtful watchful expression, painted old library backdrop at dusk with warm lamp glow, official animated series key frame' },
  { key:'cartoon_tiger',  prompt:'High-end 2D animated TV-series character portrait of a stylized tiger, Netflix Stranger Things animated style / Arcane / Blood of Zeus quality, painterly cel-shading, defined ink-line silhouettes, vivid orange fur with bold black stripes, large expressive forward-facing eyes with crisp highlights, semi-anthropomorphic stylized face with human-readable proportions, intense confident expression, painted lush jungle backdrop with warm light shafts, official animated series key frame' },
  { key:'cartoon_monkey', prompt:'High-end 2D animated TV-series character portrait of a stylized macaque, Netflix Stranger Things animated style / Arcane / Blood of Zeus quality, painterly cel-shading, defined ink-line silhouettes, flesh-pink face surrounded by warm brown fur, large expressive forward-facing eyes with crisp highlights, semi-anthropomorphic stylized face with human-readable proportions, curious clever expression, painted tropical jungle canopy backdrop with golden light shafts, official animated series key frame' },

  // Fantasy / D&D classes — bank-card portraits, AAA game-render quality
  { key:'elf',     prompt:'Cinematic close-up portrait of a high elf ranger, long pointed ears clearly visible, sharp angular cheekbones, long flowing braided hair with leaves woven in, intricate green and silver leather forest armor, longbow over the shoulder, serene watchful expression, AAA fantasy game render quality, soft golden hour light filtering through ancient enchanted forest with god-rays, ArtStation key art, painterly realism' },
  { key:'dwarf',   prompt:'Cinematic close-up portrait of a stout mountain dwarf warrior, broad shoulders, thick braided beard with metal beard rings, heavy ornate hammered plate armor, fur-lined cloak, two-handed war hammer, grim determined expression, AAA fantasy game render quality, warm orange forge light with deep blue shadows, dwarven stone hall background, ArtStation key art, painterly realism' },
  { key:'warrior', prompt:'Cinematic close-up portrait of a battle-hardened human warrior, weathered scarred skin, shoulder-length hair tied back, battle-worn steel plate armor with leather straps and a tattered red cloak, longsword in hand, intense focused expression, AAA fantasy game render quality, dramatic stormy dusk light on a rocky highland battlefield with smoke in the distance, ArtStation key art, painterly realism' },
  { key:'mage',    prompt:'Cinematic close-up portrait of an arcane mage, deep midnight-blue robes with silver runic embroidery, hood lowered, long staff topped with a softly glowing crystal, glowing rune-circles of pale blue light hovering near one hand, focused intelligent expression, AAA fantasy game render quality, ancient stone arcane library tower at night with floating candles and starry sky, ArtStation key art, painterly realism' },
  { key:'priest',  prompt:'Cinematic close-up portrait of a holy paladin priest, flowing white-and-gold ceremonial robes with embroidered sun motifs over an ornate gilded breastplate, hood lowered, glowing golden medallion in one hand, calm benevolent expression, AAA fantasy game render quality, grand cathedral interior at dawn with stained-glass coloured light and warm golden god-rays, ArtStation key art, painterly realism' },
  { key:'goblin',  prompt:'Cinematic close-up portrait of a mischievous green-skinned goblin trickster, large pointed ears, sharp cunning eyes, mismatched leather scrap armor with rusty buckles, dagger in one hand, sly grin, AAA fantasy game render quality, lantern-lit goblin warren tunnel background with glowing fungus and warm amber light, ArtStation key art, painterly realism' },
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
