import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Read .env.local manually
const envPath = path.join(rootDir, '.env.local');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = trimmed.replace('VITE_SUPABASE_URL=', '').replace(/^#\s*/, '').trim();
    }
    if (trimmed.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) {
      supabaseKey = trimmed.replace('VITE_SUPABASE_PUBLISHABLE_KEY=', '').replace(/^#\s*/, '').trim();
    }
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase URL or Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const dataDir = path.join(rootDir, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function syncToLocal() {
  console.log('⬇️ Starting sync from Supabase to local data/ folder...');

  // 1. Sync schedule_base
  console.log('📦 Fetching schedule_base from Supabase...');
  const { data: baseRows, error: baseErr } = await supabase
    .from('schedule_base')
    .select('data')
    .eq('id', 'default')
    .maybeSingle();

  if (baseErr) {
    console.error('   ❌ Error fetching schedule_base:', baseErr.message);
  } else if (baseRows?.data) {
    const baseFilePath = path.join(dataDir, 'schedule_base.json');
    fs.writeFileSync(baseFilePath, JSON.stringify(baseRows.data, null, 2));
    console.log('   ✅ Downloaded and saved schedule_base.json');
  }

  // 2. Sync schedule_months
  console.log('📅 Fetching schedule_months from Supabase...');
  const { data: monthRows, error: monthErr } = await supabase
    .from('schedule_months')
    .select('month, data');

  if (monthErr) {
    console.error('   ❌ Error fetching schedule_months:', monthErr.message);
  } else if (Array.isArray(monthRows)) {
    for (const row of monthRows) {
      if (row.month && row.data) {
        const [year, monthNum] = row.month.split('-');
        const filename = `schedule_${year}_${monthNum}.json`;
        const filePath = path.join(dataDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(row.data, null, 2));
        console.log(`   ✅ Downloaded and saved ${filename}`);
      }
    }
  }

  // 3. Sync shift_requests
  console.log('📩 Fetching shift_requests from Supabase...');
  const { data: shiftRows, error: shiftErr } = await supabase
    .from('shift_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (shiftErr) {
    console.log('   ⚠️ Could not fetch shift_requests from Supabase (or table empty):', shiftErr.message);
  } else if (Array.isArray(shiftRows) && shiftRows.length > 0) {
    const shiftFilePath = path.join(dataDir, 'shift_requests.json');
    fs.writeFileSync(shiftFilePath, JSON.stringify(shiftRows, null, 2));
    console.log('   ✅ Downloaded and saved shift_requests.json');
  }

  console.log('🎉 All data successfully synced from Supabase to local data/ directory!');
}

syncToLocal().catch((err) => {
  console.error('❌ Sync failed:', err);
});
