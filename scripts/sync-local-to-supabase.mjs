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
let editorEmail = 'trunganh1608@gmail.com';

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
    if (trimmed.startsWith('VITE_EDITOR_EMAIL=')) {
      editorEmail = trimmed.replace('VITE_EDITOR_EMAIL=', '').trim();
    }
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase URL or Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const dataDir = path.join(rootDir, 'data');

async function sync() {
  console.log('🚀 Starting sync via RPC from local data/ to Supabase...');

  if (!fs.existsSync(dataDir)) {
    console.log('⚠️ No local data/ directory found.');
    return;
  }

  // 1. Sync schedule_base.json
  const baseFilePath = path.join(dataDir, 'schedule_base.json');
  if (fs.existsSync(baseFilePath)) {
    console.log('📦 Syncing schedule_base.json ...');
    const content = JSON.parse(fs.readFileSync(baseFilePath, 'utf-8'));
    
    // Get current updated_at to pass to RPC or null
    const { data: currentBase } = await supabase
      .from('schedule_base')
      .select('updated_at')
      .eq('id', 'default')
      .maybeSingle();

    const { data: updatedAt, error } = await supabase.rpc('save_schedule_base_if_current_by_email', {
      input_email: editorEmail,
      input_data: content,
      expected_updated_at: currentBase?.updated_at ?? null,
    });

    if (error) console.error('   ❌ Error syncing schedule_base:', error.message);
    else console.log('   ✅ schedule_base synced successfully.');
  }

  // 2. Sync month files
  const files = fs.readdirSync(dataDir);
  for (const file of files) {
    if (file.startsWith('schedule_') && file.endsWith('.json') && file !== 'schedule_base.json') {
      const match = file.match(/^schedule_(\d{4})_(\d{2})\.json$/);
      if (match) {
        const month = `${match[1]}-${match[2]}`;
        console.log(`📅 Syncing month ${month} (${file}) ...`);
        const content = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));

        const { data: currentMonth } = await supabase
          .from('schedule_months')
          .select('updated_at')
          .eq('month', month)
          .maybeSingle();

        const { error } = await supabase.rpc('save_schedule_month_if_current_by_email', {
          input_email: editorEmail,
          input_month: month,
          input_data: content,
          expected_updated_at: currentMonth?.updated_at ?? null,
        });

        if (error) console.error(`   ❌ Error syncing ${file}:`, error.message);
        else console.log(`   ✅ ${file} synced successfully.`);
      }
    }
  }

  console.log('🎉 Sync completed!');
}

sync().catch((err) => {
  console.error('❌ Sync failed:', err);
});
