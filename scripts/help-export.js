#!/usr/bin/env node

/**
 * Quick helper to get localStorage copy command
 */

console.log('\n📋 Quick Export Guide\n');
console.log('Follow these 3 simple steps:\n');
console.log('1️⃣  Open browser DevTools (Press F12)');
console.log('2️⃣  Go to Console tab');
console.log('3️⃣  Copy and run this command:\n');
console.log('   \x1b[36mcopy(JSON.stringify(localStorage))\x1b[0m\n');
console.log('4️⃣  Then run:\n');
console.log('   \x1b[33mnode scripts/export-data.js\x1b[0m\n');
console.log('   And paste the data when prompted.\n');
console.log('✅ Your data will be saved to: data/backup.json\n');
