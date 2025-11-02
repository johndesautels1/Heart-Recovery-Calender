import app from './app';

const PORT = process.env.PORT || 8080;

// Critical security validation: Ensure JWT_SECRET is set before starting server
if (!process.env.JWT_SECRET) {
  console.error('═══════════════════════════════════════════════════════════════');
  console.error('FATAL ERROR: JWT_SECRET environment variable is not set!');
  console.error('═══════════════════════════════════════════════════════════════');
  console.error('');
  console.error('The application cannot start without a secure JWT secret.');
  console.error('');
  console.error('To fix this:');
  console.error('1. Copy .env.example to .env:');
  console.error('   cp .env.example .env');
  console.error('');
  console.error('2. Generate a secure JWT_SECRET:');
  console.error('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  console.error('');
  console.error('3. Add the generated secret to your .env file:');
  console.error('   JWT_SECRET=<your_generated_secret_here>');
  console.error('');
  console.error('4. Restart the server');
  console.error('');
  console.error('═══════════════════════════════════════════════════════════════');
  process.exit(1);
}

// Validate JWT_SECRET minimum length for security
if (process.env.JWT_SECRET.length < 32) {
  console.error('═══════════════════════════════════════════════════════════════');
  console.error('WARNING: JWT_SECRET is too short (minimum 32 characters)!');
  console.error('═══════════════════════════════════════════════════════════════');
  console.error('');
  console.error('Your current JWT_SECRET is not secure enough.');
  console.error('Please generate a longer secret (64+ characters recommended):');
  console.error('');
  console.error('  node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  console.error('');
  console.error('═══════════════════════════════════════════════════════════════');
  process.exit(1);
}

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ JWT authentication configured`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
});