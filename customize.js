#!/usr/bin/env node

/**
 * Heart Recovery Calendar - Customization Script
 *
 * This interactive script helps you customize the application for a new project.
 * It will update app names, colors, database settings, and more.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility function to ask questions
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Main customization flow
async function customize() {
  console.clear();
  log('========================================', 'bright');
  log('  Heart Recovery Calendar', 'green');
  log('  Application Customization Tool', 'blue');
  log('========================================', 'bright');
  console.log('');
  log('This tool will help you customize the application for your needs.', 'blue');
  console.log('');

  try {
    // Collect customization data
    const appName = await question('Application Name (e.g., "My Health Tracker"): ');
    const dbName = await question('Database Name (e.g., "my_health_db"): ');
    const orgName = await question('Organization/Company Name: ');
    const supportEmail = await question('Support Email (e.g., "support@example.com"): ');

    console.log('');
    log('Primary Color Theme:', 'blue');
    log('1. Blue (default - cardiac/medical)', 'blue');
    log('2. Green (wellness/recovery)', 'green');
    log('3. Purple (therapy/mental health)');
    log('4. Orange (fitness/energy)');
    const colorChoice = await question('Select color theme (1-4) [1]: ') || '1';

    const colorThemes = {
      '1': { primary: '#3b82f6', name: 'blue' },
      '2': { primary: '#10b981', name: 'green' },
      '3': { primary: '#8b5cf6', name: 'purple' },
      '4': { primary: '#f59e0b', name: 'orange' },
    };

    const selectedColor = colorThemes[colorChoice] || colorThemes['1'];

    console.log('');
    log('Feature Customization:', 'blue');
    log('Which features do you want to enable?', 'blue');
    const enableQR = (await question('Enable QR Code features? (y/n) [y]: ') || 'y').toLowerCase() === 'y';
    const enableExport = (await question('Enable Calendar Export? (y/n) [y]: ') || 'y').toLowerCase() === 'y';
    const enableTherapist = (await question('Enable Therapist Mode? (y/n) [y]: ') || 'y').toLowerCase() === 'y';

    console.log('');
    log('========================================', 'bright');
    log('Customization Summary:', 'green');
    log('========================================', 'bright');
    console.log(`App Name: ${appName}`);
    console.log(`Database: ${dbName}`);
    console.log(`Organization: ${orgName}`);
    console.log(`Support Email: ${supportEmail}`);
    console.log(`Color Theme: ${selectedColor.name}`);
    console.log(`QR Codes: ${enableQR ? 'Enabled' : 'Disabled'}`);
    console.log(`Calendar Export: ${enableExport ? 'Enabled' : 'Disabled'}`);
    console.log(`Therapist Mode: ${enableTherapist ? 'Enabled' : 'Disabled'}`);
    console.log('');

    const confirm = await question('Apply these changes? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      log('Customization cancelled.', 'yellow');
      rl.close();
      return;
    }

    console.log('');
    log('Applying customizations...', 'blue');

    // Update frontend .env
    log('[1/5] Updating frontend environment...', 'blue');
    updateEnvFile('frontend/.env', {
      'VITE_APP_NAME': appName,
    });

    // Update backend .env
    log('[2/5] Updating backend environment...', 'blue');
    updateEnvFile('backend/.env', {
      'DB_NAME': dbName,
    });

    // Update package.json files
    log('[3/5] Updating package.json files...', 'blue');
    const sanitizedName = appName.toLowerCase().replace(/\s+/g, '-');
    updatePackageJson('frontend/package.json', sanitizedName + '-frontend');
    updatePackageJson('backend/package.json', sanitizedName + '-backend');

    // Update README
    log('[4/5] Updating README...', 'blue');
    updateReadme('README.md', {
      appName,
      dbName,
      orgName,
      supportEmail,
    });

    // Create feature config
    log('[5/5] Creating feature configuration...', 'blue');
    createFeatureConfig('frontend/src/config/features.ts', {
      enableQR,
      enableExport,
      enableTherapist,
    });

    console.log('');
    log('========================================', 'bright');
    log('✓ Customization Complete!', 'green');
    log('========================================', 'bright');
    console.log('');
    log('Next Steps:', 'blue');
    console.log('1. Review the updated .env files in frontend/ and backend/');
    console.log('2. Update your database password in backend/.env');
    console.log(`3. Create the database: psql -U postgres -c "CREATE DATABASE ${dbName};"`);
    console.log('4. Run migrations: cd backend && npm run migrate');
    console.log('5. Customize colors in frontend/src/index.css (optional)');
    console.log('6. Replace logo files in frontend/public/ (optional)');
    console.log('');
    log('Happy coding! 🚀', 'green');

  } catch (error) {
    log(`Error: ${error.message}`, 'red');
  } finally {
    rl.close();
  }
}

// Helper functions
function updateEnvFile(filePath, updates) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    log(`  Warning: ${filePath} not found, skipping...`, 'yellow');
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(fullPath, content, 'utf8');
  log(`  ✓ Updated ${filePath}`, 'green');
}

function updatePackageJson(filePath, newName) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    log(`  Warning: ${filePath} not found, skipping...`, 'yellow');
    return;
  }

  const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  pkg.name = newName;

  fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2), 'utf8');
  log(`  ✓ Updated ${filePath}`, 'green');
}

function updateReadme(filePath, data) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    log(`  Warning: ${filePath} not found, skipping...`, 'yellow');
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Replace app name in title
  content = content.replace(/# Heart Recovery Calendar/g, `# ${data.appName}`);

  // Replace database name
  content = content.replace(/heart_recovery_calendar/g, data.dbName);

  // Replace support email
  content = content.replace(/support@heartrecovery\.com/g, data.supportEmail);

  fs.writeFileSync(fullPath, content, 'utf8');
  log(`  ✓ Updated ${filePath}`, 'green');
}

function createFeatureConfig(filePath, features) {
  const fullPath = path.join(process.cwd(), filePath);
  const dirPath = path.dirname(fullPath);

  // Create directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const content = `/**
 * Feature Flags Configuration
 *
 * Enable or disable features in the application.
 * This file was auto-generated by the customization script.
 */

export const features = {
  // QR Code generation and scanning
  qrCodes: ${features.enableQR},

  // Calendar export to Google Calendar, Apple Calendar, etc.
  calendarExport: ${features.enableExport},

  // Therapist mode and patient management
  therapistMode: ${features.enableTherapist},

  // Additional features (can be customized)
  notifications: true,
  analytics: true,
  mealTracking: true,
  vitalsTracking: true,
  medicationTracking: true,
  exercisePrescriptions: ${features.enableTherapist},
};

// Check if a feature is enabled
export function isFeatureEnabled(featureName: keyof typeof features): boolean {
  return features[featureName] === true;
}

export default features;
`;

  fs.writeFileSync(fullPath, content, 'utf8');
  log(`  ✓ Created ${filePath}`, 'green');
}

// Run the customization
customize();
