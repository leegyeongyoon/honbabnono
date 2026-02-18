const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.OPENAI_API_KEY || fs.readFileSync(path.join(__dirname, '..', '.env.development'), 'utf8')
  .split('\n')
  .find(l => l.startsWith('OPENAI_API_KEY='))
  ?.split('=').slice(1).join('=');

const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'assets', 'categories');

const categories = [
  { id: 'bbq', name: '고기/구이', prompt: 'grilled meat on a charcoal grill with tongs, Korean BBQ samgyeopsal' },
  { id: 'hotpot', name: '전골/찌개', prompt: 'a steaming Korean hot pot (jjigae) in a stone bowl with bubbling broth' },
  { id: 'buffet', name: '뷔페/무한리필', prompt: 'an elegant buffet spread with multiple dishes on a long table' },
  { id: 'seafood', name: '해산물/회', prompt: 'fresh sashimi platter with salmon and tuna slices beautifully arranged' },
  { id: 'pizza', name: '피자/치킨', prompt: 'a slice of pizza with melted cheese stretching and golden fried chicken' },
  { id: 'bar', name: '주점/술집', prompt: 'beer glasses clinking together with Korean bar food (anju) on the side' },
  { id: 'course', name: '코스요리', prompt: 'a fine dining course meal plate with elegant plating and garnish' },
  { id: 'party', name: '파티룸', prompt: 'a birthday cake with candles in a decorated party room with balloons' },
];

const BASE_STYLE = `Minimalist flat illustration icon, soft muted taupe and warm beige color palette (#B8A090, #C8B8AC, #8C7565), clean white background, rounded style, no text, no borders, centered composition, modern app icon aesthetic, soft shadows, 2D vector art style`;

async function generateImage(category) {
  const fullPrompt = `${BASE_STYLE}. Subject: ${category.prompt}`;

  console.log(`[${category.id}] Generating: ${category.name}...`);

  const body = JSON.stringify({
    model: 'dall-e-3',
    prompt: fullPrompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
    response_format: 'url',
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/images/generations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', async () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            console.error(`[${category.id}] API Error:`, json.error.message);
            reject(new Error(json.error.message));
            return;
          }
          const imageUrl = json.data[0].url;
          console.log(`[${category.id}] Downloading image...`);
          await downloadImage(imageUrl, path.join(OUTPUT_DIR, `${category.id}.png`));
          console.log(`[${category.id}] ✅ Saved!`);
          resolve();
        } catch (e) {
          console.error(`[${category.id}] Parse error:`, data.substring(0, 200));
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadImage(res.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      const stream = fs.createWriteStream(filepath);
      res.pipe(stream);
      stream.on('finish', () => { stream.close(); resolve(); });
      stream.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  console.log('🎨 Generating category icons with DALL-E 3...');
  console.log(`Output: ${OUTPUT_DIR}\n`);

  // Generate sequentially to avoid rate limits
  for (const cat of categories) {
    try {
      await generateImage(cat);
    } catch (err) {
      console.error(`[${cat.id}] ❌ Failed: ${err.message}`);
    }
    // Small delay between requests
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n🎉 Done! Generated icons in:', OUTPUT_DIR);
}

main();
