#!/usr/bin/env node

/**
 * Script to export localStorage data to a backup file
 *
 * Usage:
 * 1. Open browser DevTools (F12)
 * 2. Go to Console tab
 * 3. Run: copy(JSON.stringify(localStorage))
 * 4. Paste the output when prompted by this script
 *
 * Or run with data directly:
 * node scripts/export-data.js '{"key":"value"}'
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.join(__dirname, '..', 'data');
const BACKUP_FILE = path.join(BACKUP_DIR, 'backup.json');

// Ensure data directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function extractScheduleData(localStorageData) {
  const data = {
    doctors: [],
    tours: [],
    tourOrder: [],
    tourOverrides: {},
    doctorOverrides: {},
    showPkdv: true,
    departmentAssignments: {},
  };

  try {
    // Parse localStorage data
    const storage =
      typeof localStorageData === 'string' ? JSON.parse(localStorageData) : localStorageData;

    // Extract each key
    if (storage.hospitalDoctors) {
      data.doctors = JSON.parse(storage.hospitalDoctors);
    }
    if (storage.hospitalTours) {
      data.tours = JSON.parse(storage.hospitalTours);
    }
    if (storage.hospitalTourOrder) {
      data.tourOrder = JSON.parse(storage.hospitalTourOrder);
    }
    if (storage.hospitalTourOverrides) {
      data.tourOverrides = JSON.parse(storage.hospitalTourOverrides);
    }
    if (storage.hospitalDoctorOverrides) {
      data.doctorOverrides = JSON.parse(storage.hospitalDoctorOverrides);
    }
    if (storage.hospitalShowPkdv) {
      data.showPkdv = JSON.parse(storage.hospitalShowPkdv);
    }
    if (storage.hospitalDepartmentAssignments) {
      data.departmentAssignments = JSON.parse(storage.hospitalDepartmentAssignments);
    }

    return data;
  } catch (error) {
    console.error('Error parsing localStorage data:', error.message);
    return null;
  }
}

function saveBackup(data) {
  const timestamp = new Date().toISOString();
  const backupData = {
    exportedAt: timestamp,
    data: data,
  };

  fs.writeFileSync(BACKUP_FILE, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`✅ Data exported successfully to: ${BACKUP_FILE}`);
  console.log(
    `📊 Exported ${data.doctors?.length || 0} doctors and ${data.tours?.length || 0} tours`,
  );
}

// Check if data was passed as argument
if (process.argv[2]) {
  const inputData = process.argv[2];
  const scheduleData = extractScheduleData(inputData);

  if (scheduleData) {
    saveBackup(scheduleData);
  } else {
    console.error('❌ Failed to parse input data');
    process.exit(1);
  }
} else {
  // Interactive mode
  console.log('📋 localStorage Data Export Tool\n');
  console.log('Please follow these steps:');
  console.log('1. Open your browser with the app running');
  console.log('2. Press F12 to open DevTools');
  console.log('3. Go to Console tab');
  console.log('4. Run this command: copy(JSON.stringify(localStorage))');
  console.log('5. Paste the copied data below and press Enter\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Paste localStorage data here: ', (answer) => {
    rl.close();

    if (!answer.trim()) {
      console.error('❌ No data provided');
      process.exit(1);
    }

    const scheduleData = extractScheduleData(answer);

    if (scheduleData) {
      saveBackup(scheduleData);
    } else {
      console.error('❌ Failed to parse input data');
      process.exit(1);
    }
  });
}
