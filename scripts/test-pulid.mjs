// Diagnostic: hit PuLID with the same params the backend uses,
// using a real face photo. Tells us whether PuLID is actually reachable
// and producing identity-locked output, or silently failing.
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

const PULID_VERSION = '8baa7ef2255075b46f4d91cd238c21d31181b3e6a864463f967960bb0112525b';

// Use an existing photo as the face source — pick whatever exists
const FACE_PATH = process.argv[2] || path.resolve(__dirname, '../frontend/portraits/warrior.jpg');
if (!fs.existsSync(FACE_PATH)) { console.error('No face file at', FACE_PATH); process.exit(1); }
const buf = fs.readFileSync(FACE_PATH);
const b64 = buf.toString('base64');
const dataUrl = 'data:image/jpeg;base64,' + b64;
console.log('Using face:', FACE_PATH, 'bytes:', buf.length, 'b64 chars:', b64.length);

const body = {
  version: PULID_VERSION,
  input: {
    main_face_image: dataUrl,
    width: 896,
    height: 1152,
    prompt: 'cinematic close-up portrait, face and upper body, looking at camera, casual modern outfit',
    negative_prompt: 'multiple faces, deformed, low quality',
    num_steps: 20,
    guidance_scale: 4,
    id_weight: 2.4,
    start_step: 0,
    true_cfg: 1,
    output_format: 'webp',
    output_quality: 92,
  }
};

console.log('POSTing to Replicate predictions…');
const res = await fetch('https://api.replicate.com/v1/predictions', {
  method: 'POST',
  headers: { 'Authorization': 'Token ' + TOKEN, 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});
const text = await res.text();
console.log('HTTP status:', res.status);
let pred;
try { pred = JSON.parse(text); } catch { console.log('NON-JSON response:'); console.log(text); process.exit(1); }
if (!pred.id) { console.error('NO PREDICTION ID. Full response:'); console.log(JSON.stringify(pred, null, 2)); process.exit(1); }
console.log('Started prediction:', pred.id, 'status:', pred.status);

for (let i=0; i<60; i++) {
  await new Promise(r => setTimeout(r, 3000));
  const r = await fetch('https://api.replicate.com/v1/predictions/' + pred.id, { headers: { 'Authorization': 'Token ' + TOKEN } });
  pred = await r.json();
  process.stdout.write('.');
  if (pred.status === 'succeeded') {
    console.log('\nSUCCEEDED. Output:', pred.output);
    console.log('Logs (tail):'); console.log((pred.logs || '').split('\n').slice(-30).join('\n'));
    process.exit(0);
  }
  if (pred.status === 'failed' || pred.status === 'canceled') {
    console.log('\nFAILED. Error:', pred.error);
    console.log('Logs:'); console.log(pred.logs || '(no logs)');
    process.exit(1);
  }
}
console.log('\nTimed out');
